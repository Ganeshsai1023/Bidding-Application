package com.bidstream.repository;

import com.bidstream.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    List<Bid> findTop10ByItemIdOrderByAmountDesc(Long itemId);

    @Modifying
    @Query("UPDATE Bid b SET b.status = 'OUTBID' WHERE b.item.id = :itemId AND b.id != :latestBidId")
    void markPreviousBidsAsOutbid(@Param("itemId") Long itemId, @Param("latestBidId") Long latestBidId);
}
