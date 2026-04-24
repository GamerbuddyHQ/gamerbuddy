// Vercel serverless entry point.
// dist/vercel/app.mjs is produced by esbuild during the build step (src/app.ts → dist/vercel/app.mjs).
// Using a pre-built JavaScript bundle means Vercel's @vercel/node never touches
// TypeScript — no moduleResolution conflicts, no missing-extension errors, no
// incompatible type versions.
export { default } from "../dist/vercel/app.mjs";
