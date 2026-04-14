/**
 * Security headers middleware — applied to every API response.
 *
 * Configured to allow exactly the third-party services Gamerbuddy integrates:
 *   • Stripe.js + card-element iframes   (js.stripe.com / hooks.stripe.com)
 *   • Razorpay checkout modal            (checkout.razorpay.com)
 *   • Tenor GIF API + CDN                (api.tenor.com / media.tenor.com)
 *   • Google Fonts                       (fonts.googleapis.com / fonts.gstatic.com)
 *
 * Everything else is blocked by default.
 */

import helmet from "helmet";
import type { RequestHandler } from "express";

const isProd = process.env.NODE_ENV === "production";

// ── Content-Security-Policy ────────────────────────────────────────────────
//
// Resource-by-resource rationale:
//
//   default-src 'self'
//     Baseline: everything not explicitly listed falls back to same-origin only.
//
//   script-src 'self' js.stripe.com checkout.razorpay.com
//     Stripe.js and Razorpay inject their own scripts that must load from
//     their CDNs. 'unsafe-inline' is intentionally absent — it would defeat
//     XSS protection. Vite builds output separate .js files, not inline scripts.
//
//   connect-src 'self' api.stripe.com api.razorpay.com api.tenor.com
//     Stripe and Razorpay make XHR/fetch calls to their APIs from the browser.
//     Tenor search is queried from the community page.
//     wss: allows WebSocket connections for Socket.io live-chat.
//
//   frame-src js.stripe.com hooks.stripe.com
//     Stripe Elements renders the card input inside a sandboxed iframe hosted
//     on js.stripe.com/hooks.stripe.com. Without this the card form breaks.
//
//   img-src 'self' data: blob: media.tenor.com
//     data: is required for SVG inlining and some UI libraries.
//     blob: is required for file preview before upload.
//     media.tenor.com serves the GIF thumbnails and full GIFs.
//
//   font-src 'self' fonts.gstatic.com
//     Google Fonts files are served from gstatic.com (fonts.googleapis.com
//     serves the CSS; gstatic.com serves the actual font binaries).
//
//   style-src 'self' 'unsafe-inline' fonts.googleapis.com
//     'unsafe-inline' is needed for Tailwind CSS utility classes and
//     CSS-in-JS/inline style attributes used throughout the React components.
//     fonts.googleapis.com serves the @font-face CSS for Google Fonts.
//
//   object-src 'none'
//     Blocks all <object>, <embed>, <applet> — common plugin-injection vectors.
//
//   base-uri 'self'
//     Prevents <base href="https://evil.com"> attacks that redirect all
//     relative URLs to an attacker-controlled host.
//
//   form-action 'self'
//     All HTML forms must POST to the same origin. Prevents form hijacking.
//
//   upgrade-insecure-requests (production only)
//     Tells browsers to rewrite http:// → https:// for sub-resources before
//     fetching. Only set in production; in development the dev server uses HTTP.

const cspDirectives: Parameters<typeof helmet.contentSecurityPolicy>[0]["directives"] = {
  defaultSrc:  ["'self'"],
  scriptSrc:   ["'self'", "https://js.stripe.com", "https://checkout.razorpay.com"],
  connectSrc:  ["'self'", "https://api.stripe.com", "https://api.razorpay.com", "https://api.tenor.com", "wss:"],
  frameSrc:    ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
  imgSrc:      ["'self'", "data:", "blob:", "https://media.tenor.com"],
  fontSrc:     ["'self'", "https://fonts.gstatic.com"],
  styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  objectSrc:   ["'none'"],
  baseUri:     ["'self'"],
  formAction:  ["'self'"],
  ...(isProd ? { upgradeInsecureRequests: [] } : {}),
};

export const securityHeaders: RequestHandler = helmet({
  // ── Content-Security-Policy ──────────────────────────────────────────────
  contentSecurityPolicy: {
    directives: cspDirectives,
  },

  // ── X-Frame-Options: SAMEORIGIN ──────────────────────────────────────────
  // Prevents the app from being embedded in iframes on other origins,
  // blocking clickjacking attacks. SAMEORIGIN allows our own pages to embed
  // each other (e.g. admin panels) but blocks external framing.
  frameguard: { action: "sameorigin" },

  // ── X-Content-Type-Options: nosniff ──────────────────────────────────────
  // Tells browsers not to MIME-sniff the Content-Type header. Without this,
  // a browser might execute a JSON API response as JavaScript if the attacker
  // can trick the victim into navigating to it directly.
  noSniff: true,

  // ── Strict-Transport-Security ─────────────────────────────────────────────
  // Forces HTTPS for 1 year (includeSubDomains, preload-ready).
  // Only sent in production — dev servers use plain HTTP and a premature HSTS
  // header would break the development workflow by locking the browser to HTTPS.
  hsts: isProd
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,

  // ── Referrer-Policy: strict-origin-when-cross-origin ─────────────────────
  // Sends the full URL as the Referer header for same-origin requests
  // (useful for analytics), but only the origin (no path/query) for
  // cross-origin requests. Prevents leaking sensitive URL parameters
  // (e.g. tokens in query strings) to third-party services.
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // ── X-XSS-Protection: 0 ──────────────────────────────────────────────────
  // Explicitly disables the legacy IE/Chrome XSS auditor. The filter was
  // removed from modern browsers and was exploitable in older ones. CSP is
  // the correct mitigation; this header is kept at 0 to avoid false positives.
  xXssProtection: false,

  // ── Cross-Origin-Embedder-Policy: disabled ────────────────────────────────
  // Stripe card elements load from a cross-origin iframe. COEP would block
  // cross-origin iframes unless they opt in with CORP headers — Stripe doesn't.
  // We disable COEP to keep Stripe Elements working.
  crossOriginEmbedderPolicy: false,

  // ── Cross-Origin-Opener-Policy: same-origin-allow-popups ─────────────────
  // Razorpay checkout opens in a popup. "same-origin-allow-popups" retains
  // isolation from unrelated pages while still allowing Razorpay's popup flow.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
});
