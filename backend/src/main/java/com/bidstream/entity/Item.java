package com.bidstream.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "starting_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal startingPrice;

    /**
     * The authoritative current highest bid.
     * Protected by optimistic locking (@Version) and backed by Redis cache.
     */
    @Column(name = "current_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentPrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_winner_id")
    private User currentWinner;

    @Column(name = "auction_end_time", nullable = false)
    private Instant auctionEndTime;

    @Column(name = "auction_start_time", nullable = false)
    private Instant auctionStartTime;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AuctionStatus status = AuctionStatus.SCHEDULED;

    /**
     * Optimistic locking version — prevents lost-update race conditions at the
     * database level. If two concurrent transactions both read version=5 and
     * both try to write, the second write will throw OptimisticLockException.
     */
    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "bid_count")
    @Builder.Default
    private Long bidCount = 0L;

    public boolean isActive() {
        Instant now = Instant.now();
        return status == AuctionStatus.ACTIVE
                && now.isAfter(auctionStartTime)
                && now.isBefore(auctionEndTime);
    }

    public enum AuctionStatus {
        SCHEDULED, ACTIVE, ENDED, CANCELLED
    }
}
