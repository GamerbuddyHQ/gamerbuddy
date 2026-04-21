/**
 * Vercel Serverless Function — API entry point
 *
 * This file wraps the Express app for Vercel's serverless runtime.
 * Vercel's @vercel/node builder compiles this TypeScript file and bundles
 * all imports (including workspace packages) into a single function.
 *
 * All requests to /api/* are rewritten to this function via vercel.json.
 * The Express app internally mounts all routes under /api via app.use("/api", router).
 *
 * Required environment variables in Vercel dashboard:
 *   DATABASE_URL         — Neon / Supabase / PlanetScale PostgreSQL connection string
 *   SESSION_SECRET       — Random 64-char hex string for cookie signing
 *   RAZORPAY_KEY_ID      — Razorpay key ID (use live keys in production)
 *   RAZORPAY_KEY_SECRET  — Razorpay key secret
 *   ADMIN_SECRET_KEY     — Admin API secret
 *   ADMIN_PASSWORD_HASH  — bcrypt hash of admin password
 *   FRONTEND_URL         — Your Vercel frontend URL (e.g. https://gamerbuddy.vercel.app)
 *
 * Optional:
 *   DEFAULT_OBJECT_STORAGE_BUCKET_ID — GCS bucket ID for photo uploads
 *   PRIVATE_OBJECT_DIR               — GCS private directory prefix
 *   PUBLIC_OBJECT_SEARCH_PATHS       — GCS public search paths
 */

import app from "../artifacts/api-server/src/app";

export default app;
