# BidStream — Real-Time Auction Platform

A production-grade, full-stack bidding application built with **Spring Boot** (backend) and **React** (frontend), featuring JWT authentication, Redis-backed concurrency control, and WebSocket real-time updates.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                          │
│  LoginPage  ─►  DashboardPage  ─►  ItemDetailPage              │
│                                                                  │
│  AuthContext (JWT in-memory)   ToastContext                     │
│  useWebSocket (STOMP/SockJS)   useCountdown                     │
│  Axios + Interceptors (silent refresh)                          │
└──────────────────────┬──────────────────┬───────────────────────┘
                       │ REST (HTTP/S)     │ WebSocket (WS)
                       ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Spring Boot Backend                         │
│                                                                  │
│  SecurityFilterChain  ◄──  JwtAuthenticationFilter              │
│                                                                  │
│  /api/auth/login         AuthController                         │
│  /api/auth/refresh  ─►   AuthService  ─►  RefreshToken(DB)     │
│  /api/auth/logout                                               │
│                                                                  │
│  /api/items/{id}    ─►   ItemService                           │
│  POST /api/bids     ─►   BidService                            │
│                              │                                   │
│                    ┌─────────┴──────────┐                       │
│                    ▼                    ▼                        │
│             RedisBidLockService    ItemRepository               │
│             (Lock + Price Cache)   .atomicUpdatePrice()         │
│                    │               (CAS SQL UPDATE)             │
│                    ▼                                             │
│              SimpMessagingTemplate  ──►  /topic/items/{id}     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
    Redis (Lock + Cache)        MySQL database
    per-item mutex              Users, Items, Bids
    ~0.1ms check                RefreshTokens
```

---

## High-Concurrency Bid Processing

The bid pipeline uses a **three-layer defense** against race conditions:

### Layer 1 — Redis Fast-Path Rejection (~0.1ms)
```
Incoming bid ──► getCachedPrice(itemId)
                 if bid ≤ cached + MIN_INCREMENT → reject immediately
                 (no DB hit, no lock needed)
```

### Layer 2 — Per-Item Distributed Mutex
```
acquireLock(itemId, requestId)   ← SET NX with 5s TTL
  if NOT acquired → "Another bid processing, retry"
  if acquired → proceed to DB
```

### Layer 3 — Atomic SQL Compare-And-Swap
```sql
UPDATE items
SET current_price = :newPrice, current_winner_id = :userId, bid_count = bid_count + 1
WHERE id = :itemId
  AND :newPrice > current_price
-- Returns 0 rows if someone beat you → surfaced as BidException
```

This means: **zero lost updates**, **no phantom reads**, and **O(1) Redis rejection** before ever touching Postgres.

---

## JWT Authentication Flow

```
                     Client                           Server
                       │                                │
   Register/Login ────►│ POST /api/auth/login           │
                       │◄──── { accessToken } + ────────┤
                       │      Set-Cookie: refreshToken  │
                       │      (HttpOnly, Secure, 7d)    │
                       │                                │
   API Request ────────►│ Authorization: Bearer <at>    │
                       │◄──── 200 OK                    │
                       │                                │
   AT Expires (15min) ─►│ GET /api/items → 401          │
   [Interceptor fires] │                                │
                       │ POST /api/auth/refresh ───────►│
                       │ (cookie sent automatically)    │
                       │◄──── { accessToken: new }      │
                       │ Retry original request ───────►│
                       │◄──── 200 OK                    │
```

**Key properties:**
- Access Token: **15 minutes**, stored in JS memory only (not localStorage)
- Refresh Token: **7 days**, stored in `HttpOnly; Secure` cookie
- On `401`: Axios interceptor queues all in-flight requests, refreshes once, retries all
- On refresh failure: `auth:session-expired` event → redirect to login

---

## WebSocket Real-Time Flow

```
Client A bids $500
        │
        ▼
POST /api/bids
        │
   BidService.placeBid()
        │
   Redis lock acquired
        │
   DB atomicUpdatePrice() ← returns 1 row updated
        │
   Bid entity saved
        │
   SimpMessagingTemplate.convertAndSend("/topic/items/42", {
     itemId: 42,
     newPrice: 500.00,
     winnerName: "Alice Chen",
     bidCount: 7,
     type: "BID_ACCEPTED"
   })
        │
   ┌────┴────┐
   ▼         ▼
Client A   Client B   Client C ...
(outbid    (watching) (watching)
 toast)    both see $500 instantly
```

---

## Project Structure

```
bidstream/
├── docker-compose.yml
│
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/com/bidstream/
│       ├── BidStreamApplication.java
│       ├── config/
│       │   ├── SecurityConfig.java      ← JWT filter chain, CORS
│       │   ├── WebSocketConfig.java     ← STOMP broker setup
│       │   ├── RedisConfig.java         ← Template beans
│       │   └── DataSeeder.java          ← Demo data on startup
│       ├── entity/
│       │   ├── User.java               ← UserDetails impl
│       │   ├── Item.java               ← @Version optimistic lock
│       │   ├── Bid.java
│       │   └── RefreshToken.java
│       ├── repository/
│       │   ├── UserRepository.java
│       │   ├── ItemRepository.java     ← atomicUpdatePrice() JPQL
│       │   ├── BidRepository.java
│       │   └── RefreshTokenRepository.java
│       ├── security/
│       │   ├── JwtService.java         ← HS256 token gen/validation
│       │   └── JwtAuthenticationFilter.java
│       ├── service/
│       │   ├── AuthService.java        ← register/login/refresh
│       │   ├── BidService.java         ← 3-layer concurrency
│       │   ├── ItemService.java        ← CRUD + scheduler
│       │   └── RedisBidLockService.java ← mutex + price cache
│       ├── controller/
│       │   ├── AuthController.java     ← cookie management
│       │   ├── ItemController.java
│       │   ├── BidController.java
│       │   └── GlobalExceptionHandler.java
│       └── dto/
│           └── BidStreamDtos.java      ← all request/response DTOs
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.jsx                     ← Router root
        ├── api/
        │   ├── axiosClient.js          ← interceptors + tokenStore
        │   ├── authService.js
        │   └── itemsApi.js
        ├── context/
        │   ├── AuthContext.jsx         ← user state + session restore
        │   └── ToastContext.jsx        ← toast notifications
        ├── hooks/
        │   ├── useWebSocket.js         ← STOMP/SockJS connection mgr
        │   └── useCountdown.js         ← live auction timer
        ├── components/
        │   ├── auth/ProtectedRoute.jsx
        │   ├── bidding/
        │   │   ├── BidPanel.jsx        ← main bidding UI + WS updates
        │   │   └── AuctionCard.jsx     ← dashboard grid card
        │   └── shared/
        │       ├── Navbar.jsx
        │       └── CountdownTimer.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   └── ItemDetailPage.jsx
        └── styles/
            └── global.css
```

---

## Quick Start

### Option A: Docker Compose (recommended)
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
```

### Option B: Manual
```bash
# 1. Start Redis
docker run -p 6379:6379 redis:7-alpine

# 2. Start backend
cd backend
mvn spring-boot:run

# 3. Start frontend
cd frontend
npm install
npm start
```

### Demo Accounts (seeded on startup)
| Username | Password    | Display Name     |
|----------|-------------|------------------|
| alice    | password123 | Alice Chen       |
| bob      | password123 | Bob Martinez     |
| admin    | admin123    | BidStream Admin  |

---

## API Reference

### Auth
| Method | Endpoint             | Auth | Description                        |
|--------|----------------------|------|------------------------------------|
| POST   | /api/auth/register   | —    | Create account, sets refresh cookie|
| POST   | /api/auth/login      | —    | Login, sets refresh cookie         |
| POST   | /api/auth/refresh    | Cookie | Silent access token refresh      |
| POST   | /api/auth/logout     | JWT  | Revoke all refresh tokens          |

### Items
| Method | Endpoint             | Auth | Description                        |
|--------|----------------------|------|------------------------------------|
| GET    | /api/items           | —    | All auction items                  |
| GET    | /api/items/active    | —    | Active auctions only               |
| GET    | /api/items/{id}      | —    | Single item with current state     |

### Bids
| Method | Endpoint             | Auth | Description                        |
|--------|----------------------|------|------------------------------------|
| POST   | /api/bids            | JWT  | Place a bid (409 if outbid)        |

### WebSocket
| Topic                    | Direction  | Description                    |
|--------------------------|------------|--------------------------------|
| /topic/items/{id}        | Subscribe  | Receive bid updates for item   |

---

## Production Hardening Checklist
- [ ] Set `cookie.setSecure(true)` in AuthController (requires HTTPS)
- [ ] Use a Redis Cluster for HA lock service
- [ ] Add Redis Pub/Sub for multi-instance WebSocket broadcasting
- [ ] Rotate refresh tokens on each use (prevent token theft)
- [ ] Add rate limiting on `/api/bids` (e.g., Bucket4j)
- [ ] Enable Spring Boot Actuator + Micrometer metrics
- [ ] Set `JWT_SECRET` via secrets manager (AWS Secrets Manager / Vault)
- [ ] Add bid history endpoint with pagination
- [ ] Implement auction extension logic (bid in final 60s extends by N minutes)
