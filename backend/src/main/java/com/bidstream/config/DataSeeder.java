package com.bidstream.config;

import com.bidstream.entity.Item;
import com.bidstream.entity.User;
import com.bidstream.repository.ItemRepository;
import com.bidstream.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedItems();
        log.info("✅ Demo data seeded. Login: alice/password123 or bob/password123");
    }

    private void seedUsers() {
        if (userRepository.count() > 0) return;

        userRepository.save(User.builder()
            .username("alice").password(passwordEncoder.encode("password123"))
            .email("alice@bidstream.dev").displayName("Alice Chen").build());

        userRepository.save(User.builder()
            .username("bob").password(passwordEncoder.encode("password123"))
            .email("bob@bidstream.dev").displayName("Bob Martinez").build());

        userRepository.save(User.builder()
            .username("admin").password(passwordEncoder.encode("admin123"))
            .email("admin@bidstream.dev").displayName("BidStream Admin")
            .role(User.Role.ADMIN).build());
    }

    private void seedItems() {
        if (itemRepository.count() > 0) return;

        Instant now = Instant.now();

        itemRepository.save(Item.builder()
            .title("1967 Gibson Les Paul Custom")
            .description("Stunning original 1967 Les Paul Custom in ebony black. All original hardware, minimal fret wear. Includes original hardshell case.")
            .imageUrl("https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600")
            .startingPrice(new BigDecimal("4500.00"))
            .currentPrice(new BigDecimal("4500.00"))
            .auctionStartTime(now.minus(5, ChronoUnit.MINUTES))
            .auctionEndTime(now.plus(2, ChronoUnit.HOURS))
            .status(Item.AuctionStatus.ACTIVE)
            .build());

        itemRepository.save(Item.builder()
            .title("Rolex Submariner Date — Ref. 16610")
            .description("Pre-owned Rolex Submariner with original box and papers. Serviced 2023. Tritium dial in excellent condition.")
            .imageUrl("https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600")
            .startingPrice(new BigDecimal("8900.00"))
            .currentPrice(new BigDecimal("8900.00"))
            .auctionStartTime(now.minus(10, ChronoUnit.MINUTES))
            .auctionEndTime(now.plus(45, ChronoUnit.MINUTES))
            .status(Item.AuctionStatus.ACTIVE)
            .build());

        itemRepository.save(Item.builder()
            .title("First Edition — Dune (Frank Herbert, 1965)")
            .description("First edition, first printing of Dune published by Chilton Books. Dust jacket present with minor edge wear. Near Fine condition.")
            .imageUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600")
            .startingPrice(new BigDecimal("1200.00"))
            .currentPrice(new BigDecimal("1200.00"))
            .auctionStartTime(now.plus(1, ChronoUnit.HOURS))
            .auctionEndTime(now.plus(4, ChronoUnit.HOURS))
            .status(Item.AuctionStatus.SCHEDULED)
            .build());

        itemRepository.save(Item.builder()
            .title("Abstract Oil — \"Cascade No. 7\"")
            .description("Original large-format oil on canvas by emerging artist Mara Johanssen. 120×90cm. Signed verso. Certificate of authenticity included.")
            .imageUrl("https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600")
            .startingPrice(new BigDecimal("650.00"))
            .currentPrice(new BigDecimal("650.00"))
            .auctionStartTime(now.minus(30, ChronoUnit.MINUTES))
            .auctionEndTime(now.plus(90, ChronoUnit.MINUTES))
            .status(Item.AuctionStatus.ACTIVE)
            .build());
    }
}
