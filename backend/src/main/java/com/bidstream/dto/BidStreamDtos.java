package com.bidstream.dto;

import com.bidstream.entity.Item;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

public class BidStreamDtos {

    // ── Auth ────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 50)
        private String username;
        @NotBlank @Size(min = 8)
        private String password;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 2, max = 100)
        private String displayName;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AuthResponse {
        private String accessToken;
        private String tokenType;
        private Long expiresIn;
        private UserDto user;
        private String message;

        public static AuthResponse success(String accessToken, long expiresInMs, UserDto user) {
            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .tokenType("Bearer")
                    .expiresIn(expiresInMs / 1000)
                    .user(user)
                    .build();
        }
    }

    // ── User ────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String username;
        private String displayName;
        private String email;
    }

    // ── Item ────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemDto {
        private Long id;
        private String title;
        private String description;
        private String imageUrl;
        private BigDecimal startingPrice;
        private BigDecimal currentPrice;
        private String currentWinnerName;
        private Long currentWinnerId;
        private Instant auctionStartTime;
        private Instant auctionEndTime;
        private Item.AuctionStatus status;
        private Long bidCount;
        private Long version;
    }

    // ── Bid ─────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PlaceBidRequest {
        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotNull(message = "Bid amount is required")
        @DecimalMin(value = "0.01", message = "Bid must be positive")
        private BigDecimal amount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BidDto {
        private Long id;
        private Long itemId;
        private Long userId;
        private String bidderName;
        private BigDecimal amount;
        private Instant placedAt;
    }

    // ── WebSocket broadcast payload ─────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BidUpdateMessage {
        private Long itemId;
        private BigDecimal newPrice;
        private String winnerName;
        private Long winnerId;
        private Long bidCount;
        private Instant timestamp;
        private String type; // "BID_ACCEPTED" | "AUCTION_ENDED"
    }

    // ── Error ────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ErrorResponse {
        private int status;
        private String error;
        private String message;
        private Instant timestamp;

        public static ErrorResponse of(int status, String error, String message) {
            return ErrorResponse.builder()
                    .status(status).error(error).message(message)
                    .timestamp(Instant.now()).build();
        }
    }
}
