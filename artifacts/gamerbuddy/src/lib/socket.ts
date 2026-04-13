import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    socket = io({
      path: `${base}/api/socket.io`,
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}
