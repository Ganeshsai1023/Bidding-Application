package com.bidstream.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "bids", indexes = {
    @Index(name = "idx_bids_item_id", columnList = "item_id"),
    @Index(name = "idx_bids_user_id", columnList = "user_id"),
    @Index(name = "idx_bids_placed_at", columnList = "placed_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "placed_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant placedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BidStatus status = BidStatus.ACCEPTED;

    public enum BidStatus {
        ACCEPTED,   // Bid is the current highest
        OUTBID,     // Later bid superseded this one
        REJECTED    // Did not meet minimum increment
    }
}
