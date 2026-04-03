package com.bidstream.service;

import com.bidstream.dto.BidStreamDtos.*;
import com.bidstream.entity.Item;
import com.bidstream.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository     itemRepository;
    private final RedisBidLockService redisLockService;

    @Transactional(readOnly = true)
    public ItemDto getItem(Long id) {
        Item item = itemRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Item not found: " + id));
        return toDto(item);
    }

    @Transactional(readOnly = true)
    public List<ItemDto> getActiveItems() {
        return itemRepository.findByStatusOrderByAuctionEndTimeAsc(Item.AuctionStatus.ACTIVE)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ItemDto> getAllItems() {
        return itemRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Scheduler: activates SCHEDULED auctions whose start time has passed,
     * and ends ACTIVE auctions whose end time has passed.
     */
    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void updateAuctionStatuses() {
        Instant now = Instant.now();
        itemRepository.findAll().forEach(item -> {
            if (item.getStatus() == Item.AuctionStatus.SCHEDULED
                    && now.isAfter(item.getAuctionStartTime())) {
                item.setStatus(Item.AuctionStatus.ACTIVE);
                itemRepository.save(item);
            } else if (item.getStatus() == Item.AuctionStatus.ACTIVE
                    && now.isAfter(item.getAuctionEndTime())) {
                item.setStatus(Item.AuctionStatus.ENDED);
                itemRepository.save(item);
                redisLockService.evictItemCache(item.getId());
            }
        });
    }

    // ── Mapper ─────────────────────────────────────────────────────────────

    public ItemDto toDto(Item item) {
        return ItemDto.builder()
            .id(item.getId())
            .title(item.getTitle())
            .description(item.getDescription())
            .imageUrl(item.getImageUrl())
            .startingPrice(item.getStartingPrice())
            .currentPrice(item.getCurrentPrice())
            .currentWinnerName(item.getCurrentWinner() != null
                ? item.getCurrentWinner().getDisplayName() : null)
            .currentWinnerId(item.getCurrentWinner() != null
                ? item.getCurrentWinner().getId() : null)
            .auctionStartTime(item.getAuctionStartTime())
            .auctionEndTime(item.getAuctionEndTime())
            .status(item.getStatus())
            .bidCount(item.getBidCount())
            .version(item.getVersion())
            .build();
    }
}
