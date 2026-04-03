package com.bidstream.service;

import com.bidstream.dto.BidStreamDtos.*;
import com.bidstream.entity.RefreshToken;
import com.bidstream.entity.User;
import com.bidstream.repository.RefreshTokenRepository;
import com.bidstream.repository.UserRepository;
import com.bidstream.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository         userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService             jwtService;
    private final PasswordEncoder        passwordEncoder;
    private final AuthenticationManager  authenticationManager;

    @Value("${app.jwt.access-token-expiry-ms}")
    private long accessTokenExpiryMs;

    @Value("${app.jwt.refresh-token-expiry-ms}")
    private long refreshTokenExpiryMs;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered.");
        }

        User user = User.builder()
            .username(request.getUsername())
            .password(passwordEncoder.encode(request.getPassword()))
            .email(request.getEmail())
            .displayName(request.getDisplayName())
            .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getUsername());

        String accessToken = jwtService.generateAccessToken(user);
        return AuthResponse.success(accessToken, accessTokenExpiryMs, toDto(user));
    }

    // ── Login ────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Revoke all existing refresh tokens for this user (single-session policy)
        refreshTokenRepository.revokeAllUserTokens(user.getId());

        String accessToken = jwtService.generateAccessToken(user);
        return AuthResponse.success(accessToken, accessTokenExpiryMs, toDto(user));
    }

    // ── Refresh Token creation ────────────────────────────────────────────────

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        RefreshToken token = RefreshToken.builder()
            .token(UUID.randomUUID().toString())
            .user(user)
            .expiresAt(Instant.now().plusMillis(refreshTokenExpiryMs))
            .build();
        return refreshTokenRepository.save(token);
    }

    // ── Refresh Access Token ──────────────────────────────────────────────────

    @Transactional
    public AuthResponse refreshAccessToken(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
            .orElseThrow(() -> new IllegalArgumentException("Refresh token not found"));

        if (!refreshToken.isValid()) {
            throw new IllegalArgumentException("Refresh token is expired or revoked. Please log in again.");
        }

        User user = refreshToken.getUser();
        String newAccessToken = jwtService.generateAccessToken(user);

        log.debug("Access token refreshed for user: {}", user.getUsername());
        return AuthResponse.success(newAccessToken, accessTokenExpiryMs, toDto(user));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllUserTokens(userId);
        log.info("User {} logged out, tokens revoked", userId);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UserDto toDto(User user) {
        return UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .email(user.getEmail())
            .build();
    }
}
