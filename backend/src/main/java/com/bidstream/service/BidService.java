package com.bidstream.service;

import com.bidstream.dto.BidStreamDtos.*;
import com.bidstream.entity.Bid;
import com.bidstream.entity.Item;
import com.bidstream.entity.User;
import com.bidstream.repository.BidRepository;
import com.bidstream.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * High-Concurrency Bid Processing Pipeline:
 *
 * 1. REDIS FAST-PATH: Check cached price — reject obviously stale bids in ~0.1ms
 *    without touching the DB.
 * 2. DISTRIBUTED LOCK: Acquire per-item Redis mutex to serialize concurrent bids
 *    for the same item (prevents thundering herd).
 * 3. ATOMIC DB UPDATE: Single JPQL UPDATE with WHERE :new > current_price.
 *    Returns 0 rows if someone else won the race → ObjectOptimisticLockingFailureException
 *    is caught and surfaced as a clean error.
 * 4. WEBSOCKET BROADCAST: On success, broadcast new price + winner to all subscribers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BidService {

    private final ItemRepository        itemRepository;
    private final BidRepository         bidRepository;
    private final RedisBidLockService   redisLockService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final BigDecimal MIN_INCREMENT = new BigDecimal("1.00");

    // ── Place Bid ────────────────────────────────────────────────────────────

    @Transactional
    public BidDto placeBid(PlaceBidRequest request, User bidder) {

        Long itemId   = request.getItemId();
        BigDecimal amount = request.getAmount();

        // ── Step 1: Redis fast-path price check ──────────────────────────────
        redisLockService.getCachedPrice(itemId).ifPresent(cached -> {
            if (amount.compareTo(cached.add(MIN_INCREMENT)) < 0) {
                throw new BidException(
                    "Bid of " + amount + " does not beat current price " + cached
                    + ". Minimum next bid: " + cached.add(MIN_INCREMENT));
            }
        });

        // ── Step 2: Acquire per-item distributed lock ────────────────────────
        String lockId = UUID.randomUUID().toString();
        boolean locked = redisLockService.acquireLock(itemId, lockId);
        if (!locked) {
            throw new BidException("Another bid is being processed. Please retry.");
        }

        try {
            // ── Step 3: Load item and validate auction state ─────────────────
            Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BidException("Item not found: " + itemId));

            if (!item.isActive()) {
                throw new BidException("Auction for '" + item.getTitle() + "' is not active.");
            }

            BigDecimal currentPrice = item.getCurrentPrice();
            if (amount.compareTo(currentPrice.add(MIN_INCREMENT)) < 0) {
                throw new BidException(
                    "Bid must be at least " + currentPrice.add(MIN_INCREMENT) +
                    ". Current price: " + currentPrice);
            }

            // ── Step 4: Atomic DB compare-and-swap ──────────────────────────
            // Returns 1 if updated, 0 if someone else placed a higher bid
            // between our read and this write (handles any remaining race).
            int updated = itemRepository.atomicUpdatePrice(itemId, amount, bidder.getId());

            if (updated == 0) {
                throw new BidException(
                    "Your bid was beaten by another bidder. Please refresh and try again.");
            }

            // ── Step 5: Record the bid ───────────────────────────────────────
            Bid bid = Bid.builder()
                .item(item)
                .user(bidder)
                .amount(amount)
                .status(Bid.BidStatus.ACCEPTED)
                .build();
            bid = bidRepository.save(bid);

            // Mark previous bids on this item as OUTBID
            bidRepository.markPreviousBidsAsOutbid(itemId, bid.getId());

            // ── Step 6: Warm Redis cache with new state ──────────────────────
            redisLockService.cachePrice(itemId, amount);
            redisLockService.cacheWinner(itemId, bidder.getDisplayName());

            // ── Step 7: Broadcast via WebSocket to all subscribers ───────────
            BidUpdateMessage update = BidUpdateMessage.builder()
                .itemId(itemId)
                .newPrice(amount)
                .winnerName(bidder.getDisplayName())
                .winnerId(bidder.getId())
                .bidCount(item.getBidCount() + 1)
                .timestamp(Instant.now())
                .type("BID_ACCEPTED")
                .build();

            messagingTemplate.convertAndSend("/topic/items/" + itemId, update);
            log.info("Bid accepted: item={} amount={} bidder={}", itemId, amount, bidder.getUsername());

            return BidDto.builder()
                .id(bid.getId())
                .itemId(itemId)
                .userId(bidder.getId())
                .bidderName(bidder.getDisplayName())
                .amount(amount)
                .placedAt(bid.getPlacedAt())
                .build();

        } finally {
            // Always release the lock
            redisLockService.releaseLock(itemId, lockId);
        }
    }

    // ── Exception ────────────────────────────────────────────────────────────

    public static class BidException extends RuntimeException {
        public BidException(String message) { super(message); }
    }
}
