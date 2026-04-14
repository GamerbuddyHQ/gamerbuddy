import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

export type Bid = {
  id: number;
  requestId: number;
  bidderId: number;
  bidderName: string;
  bidderIdVerified?: boolean;
  bidderTrustFactor?: number;
  bidderSessionsAsGamerCount?: number;
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

export type QuestEntry = {
  id: number;
  userId: number;
  gameName: string;
  helpType: string;
  playstyle: string;
  createdAt: string;
};

export type StreamingAccount = {
  platform: string;
  username: string;
};

export const STREAMING_PLATFORM_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; emoji: string; urlTemplate: string }
> = {
  twitch:   { label: "Twitch",           color: "#9146FF", bg: "rgba(145,70,255,0.12)", border: "rgba(145,70,255,0.3)",  emoji: "🎮", urlTemplate: "https://twitch.tv/{username}" },
  youtube:  { label: "YouTube Gaming",   color: "#FF0000", bg: "rgba(255,0,0,0.10)",    border: "rgba(255,0,0,0.28)",    emoji: "▶️", urlTemplate: "https://youtube.com/@{username}" },
  kick:     { label: "Kick",             color: "#53FC18", bg: "rgba(83,252,24,0.10)",  border: "rgba(83,252,24,0.28)",  emoji: "🟢", urlTemplate: "https://kick.com/{username}" },
  facebook: { label: "Facebook Gaming",  color: "#1877F2", bg: "rgba(24,119,242,0.10)", border: "rgba(24,119,242,0.28)", emoji: "🎯", urlTemplate: "https://fb.gg/{username}" },
  tiktok:   { label: "TikTok Live",      color: "#EE1D52", bg: "rgba(238,29,82,0.10)",  border: "rgba(238,29,82,0.28)",  emoji: "🎵", urlTemplate: "https://tiktok.com/@{username}" },
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
  sessionsAsGamerCount: number;
  sessionsAsHirerCount: number;
  beginnerFriendly: boolean;
  purchasedItems: string[];
  questEntries: QuestEntry[];
  streamingAccounts?: StreamingAccount[];
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
  userIdVerified?: boolean;
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
  isBulkHiring: boolean;
  bulkGamersNeeded: number | null;
  acceptedBidsCount: number;
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

export function useLockBulkSession() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (requestId) =>
      apiFetch(`${BASE}/requests/${requestId}/lock`, { method: "POST" }),
    onSuccess: (_, requestId) => {
      qc.invalidateQueries({ queryKey: ["request", requestId] });
      qc.invalidateQueries({ queryKey: bidKeys.list(requestId) });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function usePostRequest() {
  const qc = useQueryClient();
  return useMutation<
    any,
    any,
    { gameName: string; platform: string; skillLevel: string; objectives: string; isBulkHiring?: boolean; bulkGamersNeeded?: number }
  >({
    mutationFn: (body) =>
      apiFetch(`${BASE}/requests`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      qc.invalidateQueries({ queryKey: ["browse-requests"] });
    },
  });
}

export function useBidMessages(bidId: number | null) {
  return useQuery<ChatMessage[]>({
    queryKey: bidId ? bidKeys.messages(bidId) : ["messages", null],
    queryFn: () => apiFetch(`${BASE}/bids/${bidId}/messages`),
    enabled: !!bidId,
    refetchInterval: 60000,
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

export function useMyStreamingAccounts() {
  return useQuery<StreamingAccount[]>({
    queryKey: ["streaming-accounts"],
    queryFn: () => apiFetch(`${BASE}/streaming-accounts`),
  });
}

export function useConnectStreaming() {
  const qc = useQueryClient();
  return useMutation<any, any, { platform: string; username: string }>({
    mutationFn: (body) =>
      apiFetch(`${BASE}/streaming-accounts`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streaming-accounts"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useDisconnectStreaming() {
  const qc = useQueryClient();
  return useMutation<any, any, string>({
    mutationFn: (platform) =>
      apiFetch(`${BASE}/streaming-accounts/${platform}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streaming-accounts"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useMyQuestEntries() {
  return useQuery<QuestEntry[]>({
    queryKey: ["quest-entries"],
    queryFn: () => apiFetch(`${BASE}/quest`),
  });
}

export function useAddQuestEntry() {
  const qc = useQueryClient();
  return useMutation<QuestEntry, any, { gameName: string; helpType: string; playstyle: string }>({
    mutationFn: (data) => apiFetch(`${BASE}/quest`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quest-entries"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useDeleteQuestEntry() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (id) => apiFetch(`${BASE}/quest/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quest-entries"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
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

export type AppNotification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch(`${BASE}/notifications`),
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications-unread"],
    queryFn: () => apiFetch(`${BASE}/notifications/unread-count`),
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (id) => apiFetch(`${BASE}/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<any, any, void>({
    mutationFn: () => apiFetch(`${BASE}/notifications/read-all`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<any, any, number>({
    mutationFn: (id) => apiFetch(`${BASE}/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export const REPORT_REASONS = [
  "Fraud / Scam attempt",
  "Asking for passwords or account login",
  "Toxicity or harassment",
  "Fake profile / impersonation",
  "Not following objectives",
  "Other",
] as const;

/* ── Profile votes ── */
export type ProfileVotes = {
  likes: number;
  dislikes: number;
  myVote: "like" | "dislike" | null;
  canVote: boolean;
};

export function useProfileVotes(userId: number | null) {
  return useQuery<ProfileVotes>({
    queryKey: ["profile-votes", userId],
    queryFn: () => apiFetch(`${BASE}/users/${userId}/votes`),
    enabled: !!userId,
  });
}

export function useVoteOnProfile(userId: number | null) {
  const qc = useQueryClient();
  return useMutation<any, any, "like" | "dislike">({
    mutationFn: (voteType) =>
      apiFetch(`${BASE}/users/${userId}/vote`, {
        method: "POST",
        body: JSON.stringify({ voteType }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-votes", userId] });
      qc.invalidateQueries({ queryKey: ["user-profile", userId] });
    },
  });
}

export function useVerifyId() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; idVerified: boolean; message: string }, any, File | null>({
    mutationFn: async (file) => {
      const formData = new FormData();
      if (file) {
        formData.append("idDocument", file);
      } else {
        formData.append("confirm", "true");
      }
      const res = await fetch(`${BASE}/profile/verify`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-me"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}
