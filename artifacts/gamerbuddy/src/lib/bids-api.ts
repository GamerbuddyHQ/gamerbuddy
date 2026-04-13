import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

export type Bid = {
  id: number;
  requestId: number;
  bidderId: number;
  bidderName: string;
  price: number;
  message: string;
  status: string;
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  bidId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
};

async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const bidKeys = {
  list: (requestId: number) => ["bids", requestId] as const,
  messages: (bidId: number) => ["messages", bidId] as const,
};

export function useRequestBids(requestId: number) {
  return useQuery<Bid[]>({
    queryKey: bidKeys.list(requestId),
    queryFn: () => apiFetch(`${BASE}/requests/${requestId}/bids`),
    enabled: requestId > 0,
  });
}

export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation<Bid, any, { requestId: number; price: number; message: string }>({
    mutationFn: ({ requestId, price, message }) =>
      apiFetch(`${BASE}/requests/${requestId}/bids`, {
        method: "POST",
        body: JSON.stringify({ price, message }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.list(vars.requestId) });
    },
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation<any, any, { requestId: number; bidId: number }>({
    mutationFn: ({ requestId, bidId }) =>
      apiFetch(`${BASE}/requests/${requestId}/bids/${bidId}/accept`, { method: "POST" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.list(vars.requestId) });
      qc.invalidateQueries({ queryKey: ["request", vars.requestId] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function useCompleteRequest() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (requestId) =>
      apiFetch(`${BASE}/requests/${requestId}/complete`, { method: "POST" }),
    onSuccess: (_, requestId) => {
      qc.invalidateQueries({ queryKey: bidKeys.list(requestId) });
      qc.invalidateQueries({ queryKey: ["request", requestId] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (requestId) =>
      apiFetch(`${BASE}/requests/${requestId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function useBidMessages(bidId: number | null) {
  return useQuery<ChatMessage[]>({
    queryKey: bidId ? bidKeys.messages(bidId) : ["messages", null],
    queryFn: () => apiFetch(`${BASE}/bids/${bidId}/messages`),
    enabled: !!bidId,
    refetchInterval: 4000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation<ChatMessage, any, { bidId: number; content: string }>({
    mutationFn: ({ bidId, content }) =>
      apiFetch(`${BASE}/bids/${bidId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.messages(vars.bidId) });
    },
  });
}

export function useRequest(requestId: number) {
  return useQuery({
    queryKey: ["request", requestId],
    queryFn: () => apiFetch(`${BASE}/requests/${requestId}`),
    enabled: requestId > 0,
  });
}
