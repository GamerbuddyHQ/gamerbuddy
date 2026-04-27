const origin = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
export const API_BASE = origin ? `${origin}/api` : "/api";
