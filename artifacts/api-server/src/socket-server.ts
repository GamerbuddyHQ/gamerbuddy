import { Server as SocketIO } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./lib/logger";

let io: SocketIO | null = null;

export function createSocketServer(httpServer: HttpServer): SocketIO {
  io = new SocketIO(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id }, "Socket connected");

    socket.on("join_bid", (bidId: number) => {
      const room = `bid:${bidId}`;
      socket.join(room);
      logger.debug({ socketId: socket.id, room }, "Socket joined room");
    });

    socket.on("leave_bid", (bidId: number) => {
      const room = `bid:${bidId}`;
      socket.leave(room);
    });

    socket.on("typing", ({ bidId, userId }: { bidId: number; userId: number }) => {
      socket.to(`bid:${bidId}`).emit("typing", { userId });
    });

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): SocketIO | null {
  return io;
}

export function emitNewMessage(bidId: number, message: {
  id: number;
  bidId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}) {
  if (!io) return;
  io.to(`bid:${bidId}`).emit("new_message", message);
}
