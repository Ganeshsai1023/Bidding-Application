package com.bidstream.controller;

import com.bidstream.dto.BidStreamDtos.*;
import com.bidstream.entity.RefreshToken;
import com.bidstream.entity.User;
import com.bidstream.repository.UserRepository;
import com.bidstream.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";
    private static final int    COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

    private final AuthService    authService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {

        AuthResponse auth = authService.register(request);
        User user = userRepository.findByUsername(auth.getUser().getUsername()).orElseThrow();
        issueRefreshCookie(user, response);
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        AuthResponse auth = authService.login(request);
        User user = userRepository.findByUsername(auth.getUser().getUsername()).orElseThrow();
        issueRefreshCookie(user, response);
        return ResponseEntity.ok(auth);
    }

    /**
     * Silent token refresh endpoint.
     * Reads the HttpOnly cookie, validates the refresh token, issues a new
     * short-lived access token. The cookie itself is NOT rotated here for
     * simplicity; add rotation in production.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        String refreshTokenValue = extractRefreshCookie(request);
        if (refreshTokenValue == null) {
            return ResponseEntity.status(401)
                .body(AuthResponse.builder().message("No refresh token cookie found").build());
        }

        try {
            AuthResponse auth = authService.refreshAccessToken(refreshTokenValue);
            return ResponseEntity.ok(auth);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401)
                .body(AuthResponse.builder().message(e.getMessage()).build());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal User user,
            HttpServletResponse response) {

        if (user != null) {
            authService.logout(user.getId());
        }
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    private void issueRefreshCookie(User user, HttpServletResponse response) {
        RefreshToken token = authService.createRefreshToken(user);
        Cookie cookie = new Cookie(REFRESH_COOKIE, token.getToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set true in production (HTTPS)
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(COOKIE_MAX_AGE);
        response.addCookie(cookie);
    }

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(c -> REFRESH_COOKIE.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
