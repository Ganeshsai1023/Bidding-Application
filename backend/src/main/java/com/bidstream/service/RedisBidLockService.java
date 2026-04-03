package com.bidstream.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;

/**
 * Redis-based distributed lock and price cache.
 *
 * Strategy:
 * 1. Try to SET NX (set-if-not-exists) a per-item lock key — only ONE thread wins.
 * 2. Validate the new bid against the Redis-cached price (O(1) vs DB round-trip).
 * 3. If valid, delegate to the DB atomic update; release the lock on success.
 *
 * This two-tier approach gives us:
 *   - Fast rejection of obviously-stale bids (Redis cache check, ~0.1ms)
 *   - True atomicity on DB update (JPQL WHERE :new > current_price)
 *   - Protection against thundering herds (per-item mutex lock)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisBidLockService {

    private static final String LOCK_PREFIX  = "bid:lock:";
    private static final String PRICE_PREFIX = "bid:price:";
    private static final String WINNER_PREFIX = "bid:winner:";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.bid.lock-ttl-seconds:5}")
    private long lockTtlSeconds;

    @Value("${app.bid.cache-ttl-seconds:3600}")
    private long cacheTtlSeconds;

    /**
     * Attempt to acquire a per-item distributed lock.
     * Returns true only if this caller now holds the lock.
     */
    public boolean acquireLock(Long itemId, String requestId) {
        String key = LOCK_PREFIX + itemId;
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(key, requestId, Duration.ofSeconds(lockTtlSeconds));
        return Boolean.TRUE.equals(acquired);
    }

    /**
     * Release the lock ONLY if we still own it (prevents accidental release
     * of another thread's lock after TTL expiry and re-acquisition).
     */
    public void releaseLock(Long itemId, String requestId) {
        String key = LOCK_PREFIX + itemId;
        String current = redisTemplate.opsForValue().get(key);
        if (requestId.equals(current)) {
            redisTemplate.delete(key);
        }
    }

    // ── Price cache ──────────────────────────────────────────────────────────

    public Optional<BigDecimal> getCachedPrice(Long itemId) {
        String raw = redisTemplate.opsForValue().get(PRICE_PREFIX + itemId);
        return Optional.ofNullable(raw).map(BigDecimal::new);
    }

    public void cachePrice(Long itemId, BigDecimal price) {
        redisTemplate.opsForValue().set(
            PRICE_PREFIX + itemId,
            price.toPlainString(),
            Duration.ofSeconds(cacheTtlSeconds)
        );
    }

    public void cacheWinner(Long itemId, String winnerDisplayName) {
        redisTemplate.opsForValue().set(
            WINNER_PREFIX + itemId,
            winnerDisplayName,
            Duration.ofSeconds(cacheTtlSeconds)
        );
    }

    public Optional<String> getCachedWinner(Long itemId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(WINNER_PREFIX + itemId));
    }

    public void evictItemCache(Long itemId) {
        redisTemplate.delete(PRICE_PREFIX + itemId);
        redisTemplate.delete(WINNER_PREFIX + itemId);
    }
}
