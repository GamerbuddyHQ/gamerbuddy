# Gamerbuddy

## Overview

A full-stack gaming marketplace web app where users can hire other gamers to play co-op and multiplayer games. Built with React + Vite (frontend) and Express 5 + PostgreSQL (backend) in a pnpm monorepo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React + Vite (TypeScript, Tailwind CSS, Wouter routing, React Query)
- **Backend**: Express 5 (TypeScript)
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Custom session-based (cookie + bcryptjs)
- **Validation**: Zod (per-route schemas in `api-server/src/lib/validate.ts`)
- **Rate limiting**: `express-rate-limit` (login/signup: 5/min, bids: 5/min, comments: 10/min, messages: 30/min, tournaments: 3/min)
- **Sanitization**: HTML entity escaping on all user text; GIF markers validated to Tenor-only URLs; bare links stripped from community posts
- **Payment security**: Secret keys server-only; HMAC-SHA256 Razorpay signature verification; Stripe PaymentIntent server-side retrieval + user ownership + amount check; idempotency via `referenceId` unique partial index (prevents double-credit replay); anomaly WARN logs for deposits/bids > $500; atomic wallet operations via SQL-level increments with balance guards in WHERE clause
- **Security headers** (`artifacts/api-server/src/lib/security-headers.ts`): `helmet` v8 middleware applied as first Express middleware; CSP allows only Stripe, Razorpay, Tenor, Google Fonts explicitly; X-Frame-Options: SAMEORIGIN; X-Content-Type-Options: nosniff; Referrer-Policy: strict-origin-when-cross-origin; HSTS (1 year + preload) enabled in production only; COEP disabled to allow Stripe card element iframes; COOP: same-origin-allow-popups for Razorpay popup flow
- **Admin Security Dashboard** (`/admin/security`): Owner-only (userId=1) page; API at `GET /admin/security` (double-gated: requireAuth + requireAdmin); surfaces login attempts+lockouts, large transactions ≥$500, user reports, and full wallet TX log with search/filter; `POST /admin/security/clear-lockout/:userId` lets admin reset brute-force counters; non-admin users get 403 from API and redirect from frontend `AdminRoute` guard
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for API), Vite (frontend)
- **File uploads**: multer (for official ID during signup)

## Architecture

- `artifacts/gamerbuddy/` — React + Vite frontend (dark gamer theme, electric purple + neon cyan)
- `artifacts/api-server/` — Express 5 REST API server
- `lib/db/` — Drizzle ORM schema + client
- `lib/api-spec/` — OpenAPI 3.1 specification
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas for server validation

## Key Features

1. **Authentication**: Signup (name, email, password, phone, official ID upload) + Login with session cookies
2. **Two Wallets**:
   - Hiring Wallet: deposit only (min $10.75, max $1000) — used to post requests and escrow bids
   - Earnings Wallet: withdraw only when balance >= $100
3. **Game Requests + Bidding**: Post requests → gamers bid → hirer accepts (escrow) → gamer starts → hirer approves → payout (90%/10% fee)
4. **Session Flow**: open → bid accepted (Discord + escrow) → in_progress → gamer "Start Session" → hirer approves → completed → both review
5. **Bulk Hiring**: Post a request for 5–100 gamers at once; request stays `open` while hirer accepts multiple bids (each held in escrow individually); hirer locks roster (or auto-locks when all slots filled) → `in_progress`; on completion all accepted gamers paid 90% of their individual bid; purple badge + slot progress bar in browse/detail views
6. **Reviews + Reputation**: 1–10 score system; trust factor fully recalculated after each review: `min(100, round(avgRating×10) + min(totalSessions×2, 20))`; +50 pts to reviewer
7. **Private Chat**: per-bid chat polling every 4s
8. **Wallet Transactions**: full history with type filtering
9. **Points Shop**: buy backgrounds (200–500 pts) and titles (100–200 pts), equip to customize profile
9. **Steam-Style Profile**: animated banner (equipped background), rank badges, bio editing, session history, reviews received
10. **Game Key Shop**: browse and purchase game keys with Earnings Wallet
11. **Reports**: report users with reason + description
12. **Gift/Tip**: send tips to gamers after sessions
13. **Safety Banner**: platform safety warnings on request pages
14. **Multi-Language Support**: 10 languages (EN/HI/ES/FR/DE/PT/AR/JA/KO/ZH), persisted via localStorage, auto-detected from browser, RTL support for Arabic, language selector in navbar

## Database Schema

- `users` — accounts + points, trustFactor, bio, profileBackground, profileTitle
- `wallets` — hiringBalance, earningsBalance (doublePrecision)
- `wallet_transactions` — all money movements (type, amount, description)
- `sessions` — session tokens (7-day expiry)
- `game_requests` — requests with escrowAmount, acceptedBidId, startedAt
- `bids` — bids with discordUsername
- `messages` — per-bid private chat
- `reviews` — 1–10 ratings
- `reports` — user reports
- `profile_purchases` — items bought from points shop

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas

## API Routes

- `POST /api/auth/signup` — register (multipart/form-data)
- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me`
- `GET /api/wallets` / `POST /api/wallets/deposit` / `POST /api/wallets/withdraw` / `GET /api/wallets/transactions`
- `GET /api/requests` / `POST /api/requests` / `GET /api/requests/my` / `GET /api/requests/:id`
- `POST /api/requests/:id/bids` / `POST /api/requests/:id/bids/:bidId/accept`
- `POST /api/requests/:id/start` (gamer) / `POST /api/requests/:id/complete` (hirer)
- `POST /api/requests/:id/cancel` / `GET /api/requests/:id/reviews` / `POST /api/requests/:id/reviews`
- `POST /api/requests/:id/gift`
- `GET /api/bids/:bidId/messages` / `POST /api/bids/:bidId/messages`
- `GET /api/users/:id` — public profile with purchases
- `PATCH /api/profile` — update bio, profileBackground, profileTitle
- `GET /api/profile/shop` — all shop items
- `GET /api/profile/purchases` — user's purchases
- `POST /api/profile/purchase` — spend points on an item
- `POST /api/reports` — report a user
- `GET /api/dashboard/summary`

## Pages

- `/` — Landing/home page
- `/login` / `/signup` — Auth forms
- `/dashboard` — Dashboard (wallets + open requests count)
- `/browse` — Browse open requests
- `/my-requests` — User's requests (with cancel + session flow)
- `/requests/:id` — Request detail (bids, chat, session flow, reviews, gift)
- `/post-request` — Create new request
- `/wallets` — Wallet management + transaction history
- `/profile` — Steam-style profile (banner, badges, bio, shop, history, reviews)
- `/shop` — Game Key Shop
- `/add-funds` — Add funds to hiring wallet
