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
  discordUsername?: string | null;
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

export type Review = {
  id: number;
  requestId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string | null;
  reviewerName?: string;
  createdAt: string;
};

export type ShopItem = {
  id: string;
  type: "background" | "title";
  label: string;
  cost: number;
  description: string;
};

export type UserProfile = {
  id: number;
  name: string;
  bio: string | null;
  trustFactor: number;
  points: number;
  idVerified: boolean;
  profileBackground: string | null;
  profileTitle: string | null;
  createdAt: string;
  avgRating: number | null;
  reviewCount: number;
  reviews: Review[];
  sessionsAsHirer: { id: number; gameName: string; platform?: string; createdAt: string }[];
  sessionsAsGamer: { requestId: number; gameName: string | null; platform?: string | null; createdAt: string | null }[];
  purchasedItems: string[];
};

export async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export type GameRequest = {
  id: number;
  userId: number;
  userName: string;
  gameName: string;
  platform: string;
  skillLevel: string;
  objectives: string;
  status: string;
  escrowAmount: number | null;
  startedAt: string | null;
  createdAt: string;
  bidCount: number;
  lowestBid: number | null;
};

export const bidKeys = {
  list: (requestId: number) => ["bids", requestId] as const,
  messages: (bidId: number) => ["messages", bidId] as const,
  reviews: (requestId: number) => ["reviews", requestId] as const,
  userProfile: (userId: number) => ["user-profile", userId] as const,
  requests: (params: Record<string, string>) => ["browse-requests", params] as const,
};

export function useBrowseRequests(params: { platform?: string; skillLevel?: string; status?: string } = {}) {
  const filtered: Record<string, string> = {};
  if (params.platform) filtered.platform = params.platform;
  if (params.skillLevel) filtered.skillLevel = params.skillLevel;
  if (params.status) filtered.status = params.status;
  const qs = new URLSearchParams(filtered).toString();
  return useQuery<GameRequest[]>({
    queryKey: bidKeys.requests(filtered),
    queryFn: () => apiFetch(`${BASE}/requests${qs ? `?${qs}` : ""}`),
  });
}

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
      qc.invalidateQueries({ queryKey: ["browse-requests"] });
    },
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation<any, any, { requestId: number; bidId: number; discordUsername?: string }>({
    mutationFn: ({ requestId, bidId, discordUsername }) =>
      apiFetch(`${BASE}/requests/${requestId}/bids/${bidId}/accept`, {
        method: "POST",
        body: JSON.stringify({ discordUsername }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.list(vars.requestId) });
      qc.invalidateQueries({ queryKey: ["request", vars.requestId] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (requestId) =>
      apiFetch(`${BASE}/requests/${requestId}/start`, { method: "POST" }),
    onSuccess: (_, requestId) => {
      qc.invalidateQueries({ queryKey: ["request", requestId] });
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

export function useRequestReviews(requestId: number) {
  return useQuery<Review[]>({
    queryKey: bidKeys.reviews(requestId),
    queryFn: () => apiFetch(`${BASE}/requests/${requestId}/reviews`),
    enabled: requestId > 0,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation<Review, any, { requestId: number; rating: number; comment?: string }>({
    mutationFn: ({ requestId, rating, comment }) =>
      apiFetch(`${BASE}/requests/${requestId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.reviews(vars.requestId) });
    },
  });
}

export function useSendGift() {
  const qc = useQueryClient();
  return useMutation<any, any, { requestId: number; amount: number }>({
    mutationFn: ({ requestId, amount }) =>
      apiFetch(`${BASE}/requests/${requestId}/gift`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useReportUser() {
  return useMutation<any, any, { reportedUserId: number; reason: string; description?: string }>({
    mutationFn: ({ reportedUserId, reason, description }) =>
      apiFetch(`${BASE}/reports`, {
        method: "POST",
        body: JSON.stringify({ reportedUserId, reason, description }),
      }),
  });
}

export function useUserProfile(userId: number | null) {
  return useQuery<UserProfile>({
    queryKey: userId ? bidKeys.userProfile(userId) : ["user-profile", null],
    queryFn: () => apiFetch(`${BASE}/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUpdateBio() {
  const qc = useQueryClient();
  return useMutation<any, any, { bio: string }>({
    mutationFn: ({ bio }) =>
      apiFetch(`${BASE}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ bio }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-me"] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<any, any, { bio?: string; profileBackground?: string | null; profileTitle?: string | null }>({
    mutationFn: (updates) =>
      apiFetch(`${BASE}/profile`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: (_data, _vars, _ctx) => {
      qc.invalidateQueries({ queryKey: ["auth-me"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useShopItems() {
  return useQuery<ShopItem[]>({
    queryKey: ["shop-items"],
    queryFn: () => apiFetch(`${BASE}/profile/shop`),
    staleTime: Infinity,
  });
}

export function usePurchaseItem() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; newPoints: number }, any, string>({
    mutationFn: (itemId) =>
      apiFetch(`${BASE}/profile/purchase`, {
        method: "POST",
        body: JSON.stringify({ itemId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-me"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}
