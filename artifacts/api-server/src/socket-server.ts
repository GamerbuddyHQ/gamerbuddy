/**
 * Socket.io has been removed for serverless/Vercel compatibility.
 * All exports are stubs so that any existing import sites compile without changes.
 * Messages are persisted to the database and clients poll for updates.
 */

export function createSocketServer(_httpServer: unknown): void {
  // No-op: WebSocket server not supported in serverless deployments
}

export function getIO(): null {
  return null;
}

export function emitNewMessage(
  _bidId: number,
  _message: {
    id: number;
    bidId: number;
    senderId: number;
    senderName: string;
    content: string;
    createdAt: string;
  },
): void {
  // No-op: clients poll for new messages via REST
}
