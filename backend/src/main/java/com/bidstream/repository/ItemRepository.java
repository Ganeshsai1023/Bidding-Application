package com.bidstream.repository;

import com.bidstream.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByStatusOrderByAuctionEndTimeAsc(Item.AuctionStatus status);

    /**
     * Atomic "Compare-And-Swap" update at the DB layer.
     * Returns 1 if updated, 0 if someone else already placed a higher bid.
     * This single SQL statement eliminates the read-modify-write race condition.
     */
    @Modifying
    @Query("""
        UPDATE Item i
        SET i.currentPrice = :newPrice,
            i.currentWinner = (SELECT u FROM User u WHERE u.id = :winnerId),
            i.bidCount = i.bidCount + 1
        WHERE i.id = :itemId
          AND :newPrice > i.currentPrice
    """)
    int atomicUpdatePrice(
        @Param("itemId")   Long itemId,
        @Param("newPrice") BigDecimal newPrice,
        @Param("winnerId") Long winnerId
    );
}
