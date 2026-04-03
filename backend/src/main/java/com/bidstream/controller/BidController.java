package com.bidstream.controller;

import com.bidstream.dto.BidStreamDtos.*;
import com.bidstream.entity.User;
import com.bidstream.service.BidService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
public class BidController {

    private final BidService bidService;

    /**
     * POST /api/bids
     * Requires valid JWT in Authorization header.
     * Returns 201 CREATED with the accepted bid, or 409 CONFLICT if outbid.
     */
    @PostMapping
    public ResponseEntity<?> placeBid(
            @Valid @RequestBody PlaceBidRequest request,
            @AuthenticationPrincipal User currentUser) {

        try {
            BidDto bid = bidService.placeBid(request, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(bid);
        } catch (BidService.BidException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Bid Rejected", e.getMessage()));
        }
    }
}
