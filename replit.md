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
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
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
   - Hiring Wallet: deposit only (min $10.75, max $1000) — used to post requests
   - Earnings Wallet: withdraw only when balance >= $100
3. **Game Requests**: Post requests with game name, platform, skill level, and objectives (requires $10.75 in hiring wallet)
4. **Browse**: Public feed of all open requests with filters

## Database Schema

- `users` — user accounts (name, email, passwordHash, phone, officialIdPath, idVerified)
- `wallets` — per-user wallet (hiringBalance, earningsBalance)
- `sessions` — session tokens for auth
- `game_requests` — game hire requests (gameName, platform, skillLevel, objectives, status)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

- `POST /api/auth/signup` — register (multipart/form-data)
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — get current user
- `GET /api/wallets` — get wallet balances
- `POST /api/wallets/deposit` — add to hiring wallet
- `POST /api/wallets/withdraw` — withdraw from earnings wallet
- `GET /api/requests` — list all requests (filterable)
- `POST /api/requests` — create a new request
- `GET /api/requests/my` — current user's requests
- `GET /api/requests/:id` — get request by ID
- `GET /api/dashboard/summary` — dashboard summary

## Pages

- `/` — Landing/home page
- `/login` — Login form
- `/signup` — Signup form with file upload
- `/dashboard` — Dashboard (wallets + recent requests)
- `/browse` — Browse all open requests
- `/my-requests` — User's requests
- `/post-request` — Post a new request form
- `/wallets` — Wallet management
- `/profile` — User profile
