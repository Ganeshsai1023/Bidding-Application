package com.bidstream.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * STOMP message broker configuration.
     *
     * Client subscribes to   /topic/items/{id}   to receive bid updates.
     * Client sends bids to   /app/bid             (routed to @MessageMapping).
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker for topic-style pub/sub
        registry.enableSimpleBroker("/topic", "/queue");

        // Prefix for messages FROM clients (handled by @MessageMapping)
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix for user-specific messages (e.g., bid rejection notifications)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();  // SockJS fallback for browsers without native WS
    }
}
