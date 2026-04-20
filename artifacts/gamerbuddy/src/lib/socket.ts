/**
 * Socket.io has been removed for serverless/Vercel compatibility.
 * This stub satisfies any remaining import sites without crashing.
 * All real-time features now use REST polling (refetchInterval in React Query).
 */

const noop = () => {};

const stubSocket = {
  connected: false,
  on: noop,
  off: noop,
  emit: noop,
  connect: noop,
  disconnect: noop,
};

export function getSocket() {
  return stubSocket;
}
