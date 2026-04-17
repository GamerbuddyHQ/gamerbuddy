import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

    // If VITE_API_URL is set (cross-origin deployment), use that host.
    // Otherwise fall back to same-origin with the base path prefix.
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      const apiOrigin = new URL(apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`).origin;
      socket = io(apiOrigin, {
        path: "/api/socket.io",
        withCredentials: true,
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    } else {
      socket = io({
        path: `${base}/api/socket.io`,
        withCredentials: true,
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }
  }
  return socket;
}
