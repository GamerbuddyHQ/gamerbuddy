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
- **Payment security**: Secret keys server-only; HMAC-SHA256 Razorpay signature verification; idempotency via `referenceId` unique partial index (prevents double-credit replay); anomaly WARN logs for deposits/bids > $500; atomic wallet operations via SQL-level increments with balance guards in WHERE clause
- **Security headers** (`artifacts/api-server/src/lib/security-headers.ts`): `helmet` v8 middleware applied as first Express middleware; CSP allows only Razorpay, Tenor, Google Fonts; X-Frame-Options: SAMEORIGIN; X-Content-Type-Options: nosniff; Referrer-Policy: strict-origin-when-cross-origin; HSTS (1 year + preload) enabled in production only; COOP: same-origin-allow-popups for Razorpay popup flow
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
2. **Three Wallets / Money Flow**:
   - Hiring Wallet: deposit only (min $10.75, max $1000) — deposits via Razorpay (UPI/cards, Test Mode); used to post requests
   - Escrow: when bid is accepted, the full bid amount is held in `gameRequests.escrowAmount` and shown as an "In Escrow" card
   - Earnings Wallet: released on session completion — gamer gets 90%, platform gets 10%; withdrawal requires $100 min
   - **Withdrawal routing**: Indian users (country="India") withdraw via UPI (UPI ID required); all others via Bank Transfer (account details required)
   - **Platform Fee**: 10% collected on every session payout + every tip/gift; recorded in `platform_fees` table; visible at `/admin/platform-earnings`
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
15. **Photo Uploads**: Profile picture (avatar) + 4-slot gallery grid; GCS object storage (8MB max, images only); moderation flow — all uploads logged as `needs_review` in `user_photos` table; anti-AI disclaimer banner; avatar shown on bid cards in request detail view; gallery shown on public user profile pages

## Object Storage

- **Provider**: Google Cloud Storage (replit-objstore-f1e34354-... bucket)
- **Library**: `@google-cloud/storage` + `google-auth-library` (injected via Replit secrets)
- **Module**: `artifacts/api-server/src/lib/objectStorage.ts`
- **Serving**: `GET /api/storage/objects/*` (public read, no auth required)
- **Upload flow**: request signed PUT URL → client PUTs to GCS → confirm endpoint saves path to DB
- **Limits**: 8MB per file, images only (jpeg/png/webp/gif)
- **Photo routes**: `POST /api/profile/photo` (upload-url + confirm), `DELETE /api/profile/photo`, `POST /api/profile/gallery`, `DELETE /api/profile/gallery/:index`
- **Moderation**: every upload logged in `user_photos` table with `status=needs_review`

## Deployment Prep

- **Frontend (Vercel)**: `vercel.json` at `artifacts/gamerbuddy/vercel.json` — SPA rewrites + API proxy
- **Backend (Railway)**: `railway.json` at `artifacts/api-server/railway.json` — healthcheck + restart policy
- **Test Mode banner**: yellow warning strip in frontend when `VITE_TEST_MODE=true`
- **CORS**: production origins locked to Vercel domain via `CORS_ORIGIN` env var
- **Session cookie**: `sameSite: none, secure: true` in production for cross-origin cookie handling
- **Vulnerabilities**: 0 (fixed via pnpm catalog overrides in `pnpm-workspace.yaml`)

## Database Schema

- `users` — accounts + points, trustFactor, bio, profileBackground, profileTitle, `profilePhotoUrl`, `galleryPhotoUrls` (text[])
- `user_photos` — moderation log: userId, objectPath, photoType (profile|gallery), status (needs_review|approved|rejected), uploadedAt
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

## Phase 1 Status (current)

Core hiring MVP is live. All non-core features are locked and redirect to Coming Soon pages.

**Active (Phase 1):**
- Post Request, Browse, Bid (verified users only), Accept, Escrow, Session flow, Reviews, Wallets, Verification, Nation/Gender filtering, Request Expiry (forever / 24h / 48h / 7d; auto-closes at 0 bids; browse "Show Expired" toggle; 24h soft nudge on My Requests)
- Rate limiting: `bidLimiter` enforced on `POST /requests/:id/bids` (5 bids/min)
- Verified-only bidding: enforced server-side via `idVerified` check before bid insertion
- Payment keys: 100% env-based via `process.env` (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY) — add-funds page shows "Payments Not Yet Active" preview banner since no keys are configured yet

**Locked → Coming Soon (Phase 2+):**
- Community, Tournaments, My-Tournaments, Socials → all redirect to ComingSoon component

## Pages

- `/` — Landing/home page (Phase 1 core hiring focus)
- `/login` / `/signup` — Auth forms
- `/dashboard` — Dashboard (wallets + open requests count)
- `/browse` — Browse open requests (with country/gender filters)
- `/my-requests` — User's requests (with cancel + session flow)
- `/requests/:id` — Request detail (bids, chat, session flow, reviews, gift)
- `/post-request` — Create new request
- `/wallets` — Wallet management + transaction history
- `/profile` — Steam-style profile (banner, badges, bio, shop, history, reviews)
- `/add-funds` — Add funds preview (payments not yet active)
- `/community` → Coming Soon (Phase 2)
- `/tournaments` + `/my-tournaments` + `/tournaments/:id` → Coming Soon (Phase 3)
- `/socials` → Coming Soon (Phase 2)

## Production Deployment

Split deployment: **Vercel (frontend) + Railway (backend)**. Socket.io requires a persistent server — not compatible with Vercel serverless functions.

### Frontend → Vercel
- `vercel.json` at project root configures build + SPA routing
- Build: `pnpm --filter @workspace/gamerbuddy run build` → output at `artifacts/gamerbuddy/dist/public`
- Env vars required on Vercel:
  - `VITE_API_URL` — full Railway backend URL (e.g. `https://gamerbuddy-api.up.railway.app`)
  - `NODE_ENV=production`

### Backend → Railway
- `artifacts/api-server/railway.json` configures Railway build + health check
- Set **Root Directory** to `artifacts/api-server` in Railway project settings
- Env vars required on Railway:
  - `DATABASE_URL` — PostgreSQL connection string
  - `SESSION_SECRET` — long random string
  - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — use test keys until go-live
  - `FRONTEND_URL` — Vercel app URL (e.g. `https://gamerbuddy.vercel.app`), comma-separated for multiple origins
  - `NODE_ENV=production`
  - `PORT` — auto-provided by Railway

### Cross-Origin Auth Notes
- Session cookies use `SameSite=None; Secure` in production (set in `auth.ts` via `isProd` flag)
- CORS uses `FRONTEND_URL` env var in production; falls back to `origin:true` in dev
- Both Express CORS and Socket.io CORS updated to read `FRONTEND_URL`
- `clearCookie` on logout passes matching `SameSite/Secure` options so browser actually clears the cross-origin cookie

### Test Mode
- Test Mode banner visible on every page (below navbar, dismissible, persists via localStorage key `gb_test_banner_dismissed_v1`)
- Razorpay is in test mode — switch `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to `rzp_live_` keys when ready to go live
