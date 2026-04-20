import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import {
  Shield, LogOut, Search, Eye, EyeOff, Trash2, Ban, CheckCircle2,
  RefreshCw, ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare,
  User, AlertTriangle, Tag, ShieldOff, Pin, PinOff, ChevronDown,
  ChevronUp, Loader2, Send,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type Post = {
  id:              number;
  title:           string;
  body:            string;
  status:          string;
  category:        string;
  createdAt:       string;
  userId:          number;
  authorName:      string | null;
  authorEmail:     string | null;
  gamerbuddyId:    string | null;
  communityBanned: boolean;
  likes:           number;
  dislikes:        number;
  commentCount:    number;
};

type Comment = {
  id:              number;
  body:            string;
  createdAt:       string;
  isPinned:        boolean;
  isAdminComment:  boolean;
  authorName:      string | null;
  authorGamerbuddyId: string | null;
  replies:         Comment[];
};

const STATUS_COLORS: Record<string, string> = {
  visible: "text-green-400 bg-green-500/10 border-green-500/30",
  hidden:  "text-amber-400 bg-amber-500/10 border-amber-500/30",
  spam:    "text-red-400   bg-red-500/10   border-red-500/30",
};

/* ── Admin auth check ───────────────────────────────────────────────────── */
function useAdminAuth() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth-me"],
    queryFn:  () => apiFetch(`${BASE}/admin/auth/me`),
    retry:    false,
    staleTime: 30_000,
  });
}

/* ── Comment row ─────────────────────────────────────────────────────────── */
function CommentRow({ comment, postId }: { comment: Comment; postId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const pinMutation = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/community/comments/${comment.id}/pin`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-post-comments", postId] });
      toast({ title: comment.isPinned ? "Comment Unpinned" : "Comment Pinned" });
    },
    onError: () => toast({ title: "Error", description: "Could not toggle pin.", variant: "destructive" }),
  });

  return (
    <div className={`rounded-lg border p-3 text-sm space-y-1 ${
      comment.isPinned
        ? "border-primary/40 bg-primary/5"
        : comment.isAdminComment
          ? "border-purple-500/30 bg-purple-500/5"
          : "border-border/40 bg-muted/20"
    }`}>
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        {comment.isPinned && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full">
            <Pin className="w-2.5 h-2.5" /> Pinned by Admin
          </span>
        )}
        {comment.isAdminComment && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded-full">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        )}
        <span className="text-xs font-semibold text-foreground/70">
          {comment.isAdminComment ? "Gamerbuddy Team" : (comment.authorName ?? "Unknown")}
        </span>
        {comment.authorGamerbuddyId && !comment.isAdminComment && (
          <span className="text-[10px] font-mono text-muted-foreground/40">#{comment.authorGamerbuddyId}</span>
        )}
        <span className="text-[10px] text-muted-foreground/40 ml-auto">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Body */}
      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{comment.body}</p>

      {/* Pin button — only on top-level comments */}
      <div className="flex justify-end pt-1">
        <button
          onClick={() => pinMutation.mutate()}
          disabled={pinMutation.isPending}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
            comment.isPinned
              ? "border-primary/40 text-primary hover:bg-primary/10"
              : "border-border/40 text-muted-foreground/50 hover:text-foreground hover:border-border"
          }`}
          title={comment.isPinned ? "Unpin this comment" : "Pin this comment to the top"}
        >
          {pinMutation.isPending
            ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
            : comment.isPinned ? <PinOff className="w-2.5 h-2.5" /> : <Pin className="w-2.5 h-2.5" />
          }
          {comment.isPinned ? "Unpin" : "Pin Comment"}
        </button>
      </div>

      {/* Replies (read-only, no pin on replies) */}
      {comment.replies?.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 border-border/30 pl-3 pt-1">
          {comment.replies.map(r => (
            <div key={r.id} className="text-xs text-foreground/60 space-y-0.5">
              <span className="font-semibold text-foreground/50">{r.isAdminComment ? "Gamerbuddy Team" : (r.authorName ?? "Unknown")}</span>
              <p className="leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Post comments panel (renders inside expanded post) ───────────────────── */
function PostCommentsPanel({ post }: { post: Post }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [adminText, setAdminText] = useState("");

  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: ["admin-post-comments", post.id],
    queryFn:  () => apiFetch(`${BASE}/community/suggestions/${post.id}/comments`),
    staleTime: 15_000,
  });

  const adminCommentMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`${BASE}/admin/community/suggestions/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setAdminText("");
      qc.invalidateQueries({ queryKey: ["admin-post-comments", post.id] });
      qc.invalidateQueries({ queryKey: ["admin-community-posts"] });
      toast({ title: "Admin Comment Posted", description: "Visible to all users as 'Gamerbuddy Team'." });
    },
    onError: () => toast({ title: "Error", description: "Could not post admin comment.", variant: "destructive" }),
  });

  const comments = data?.comments ?? [];

  return (
    <div className="px-4 pb-4 space-y-4">

      {/* ── Add Admin Comment ── */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Add Admin Comment</span>
          <span className="text-[10px] text-purple-400/60 font-normal normal-case tracking-normal">— appears as "Gamerbuddy Team" to all users</span>
        </div>
        <Textarea
          value={adminText}
          onChange={e => setAdminText(e.target.value)}
          placeholder="Write an official admin response…"
          className="bg-background/50 border-purple-500/20 text-sm min-h-[80px] resize-none focus-visible:ring-purple-500/30"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && adminText.trim()) {
              adminCommentMutation.mutate(adminText.trim());
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => { if (adminText.trim()) adminCommentMutation.mutate(adminText.trim()); }}
            disabled={!adminText.trim() || adminCommentMutation.isPending}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs"
          >
            {adminCommentMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Send className="w-3 h-3" />
            }
            Post as Admin
          </Button>
        </div>
      </div>

      {/* ── Comments list ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">
          Comments ({comments.length})
          <span className="font-normal normal-case tracking-normal ml-2">— click "Pin Comment" to pin to top for all users</span>
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-border/30 bg-muted/10 p-4 text-center">
            <MessageSquare className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">No comments yet on this post.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comments.map(c => (
              <CommentRow key={c.id} comment={c} postId={post.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function AdminCommunity() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<"all" | "visible" | "hidden" | "spam">("all");

  /* ── Auth gate ── */
  const { data: authData, isLoading: authLoading } = useAdminAuth();
  if (!authLoading && !authData?.isAdmin) {
    navigate("/admin/login");
    return null;
  }

  /* ── Data ── */
  const { data, isLoading, refetch } = useQuery<{ total: number; posts: Post[] }>({
    queryKey: ["admin-community-posts"],
    queryFn:  () => apiFetch(`${BASE}/admin/community/posts`),
    enabled:  !!authData?.isAdmin,
    staleTime: 30_000,
  });

  /* ── Mutations ── */
  const hidePost = useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/admin/community/posts/${id}/hide`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast({ title: "Post Hidden" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const restorePost = useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/admin/community/posts/${id}/restore`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast({ title: "Post Restored" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/admin/community/posts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast({ title: "Post Deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const banUser = useMutation({
    mutationFn: (userId: number) => apiFetch(`${BASE}/admin/community/users/${userId}/ban`, { method: "POST" }),
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast({ title: "User Banned" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unbanUser = useMutation({
    mutationFn: (userId: number) => apiFetch(`${BASE}/admin/community/users/${userId}/unban`, { method: "POST" }),
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast({ title: "User Unbanned" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess: () => { qc.clear(); navigate("/admin/login"); },
  });

  /* ── Loading ── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Authenticating…</div>
      </div>
    );
  }

  /* ── Filter posts client-side ── */
  let posts = data?.posts ?? [];

  if (search.trim()) {
    const lower = search.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(lower) || p.body.toLowerCase().includes(lower));
  }
  if (authorFilter.trim()) {
    const lower = authorFilter.toLowerCase();
    posts = posts.filter(p =>
      (p.authorName ?? "").toLowerCase().includes(lower) ||
      (p.authorEmail ?? "").toLowerCase().includes(lower) ||
      (p.gamerbuddyId ?? "").toLowerCase().includes(lower)
    );
  }
  if (activeStatus !== "all") {
    posts = posts.filter(p => p.status === activeStatus);
  }

  const totalAll     = data?.posts.length ?? 0;
  const totalVisible = data?.posts.filter(p => p.status === "visible").length ?? 0;
  const totalHidden  = data?.posts.filter(p => p.status === "hidden").length ?? 0;
  const totalSpam    = data?.posts.filter(p => p.status === "spam").length ?? 0;

  function confirmDelete(post: Post) {
    if (window.confirm(`Permanently delete "${post.title}"? This cannot be undone.`)) {
      deletePost.mutate(post.id);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 md:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-border/60">|</span>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-bold tracking-tight">Community Moderation</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      <div className="space-y-5 max-w-[1400px] mx-auto px-4 py-6">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Posts",    value: totalAll,     color: "text-foreground",   bg: "bg-muted/40" },
            { label: "Visible",        value: totalVisible, color: "text-green-400",    bg: "bg-green-500/8" },
            { label: "Hidden",         value: totalHidden,  color: "text-amber-400",    bg: "bg-amber-500/8" },
            { label: "Spam",           value: totalSpam,    color: "text-red-400",      bg: "bg-red-500/8" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-border/50 rounded-xl p-3`}>
              <p className="text-xs text-muted-foreground/60">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{isLoading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search post title or content…"
              className="pl-9 bg-muted/30 border-border/50"
            />
          </div>
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              value={authorFilter}
              onChange={e => setAuthorFilter(e.target.value)}
              placeholder="Filter by author name or email…"
              className="pl-9 bg-muted/30 border-border/50"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Status tabs ── */}
        <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit border border-border/50 flex-wrap">
          {(["all", "visible", "hidden", "spam"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeStatus === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" ? `All (${totalAll})` : tab === "visible" ? `Visible (${totalVisible})` : tab === "hidden" ? `Hidden (${totalHidden})` : `Spam (${totalSpam})`}
            </button>
          ))}
        </div>

        {/* ── Posts list ── */}
        {isLoading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No posts found</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Status indicator */}
                  <div className="mt-0.5 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[post.status] ?? "text-muted-foreground border-border"}`}>
                      {post.status}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-semibold text-sm leading-snug">{post.title}</span>
                      <span className="text-[10px] font-mono bg-muted/60 text-muted-foreground/60 px-1.5 py-0.5 rounded capitalize">{post.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                      {post.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground/50">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-foreground/70">{post.authorName ?? "Unknown"}</span>
                        {post.gamerbuddyId && <span className="font-mono text-muted-foreground/40">#{post.gamerbuddyId}</span>}
                      </span>
                      {post.communityBanned && (
                        <span className="flex items-center gap-1 text-red-400/80 font-semibold">
                          <Ban className="w-3 h-3" /> Community Banned
                        </span>
                      )}
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-green-400/70" />{post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-red-400/70" />{post.dislikes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-blue-400/70" />{post.commentCount}
                      </span>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                    className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                    title={expandedId === post.id ? "Collapse" : "Expand post & comments"}
                  >
                    {expandedId === post.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded: full content + comments panel */}
                {expandedId === post.id && (
                  <>
                    {/* Full post body */}
                    <div className="px-4 pb-3 border-t border-border/40 pt-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Full Content</p>
                      <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{post.body}</p>
                      <div className="mt-2 text-xs text-muted-foreground/40 flex gap-4 flex-wrap">
                        <span>Post ID: #{post.id}</span>
                        <span>User ID: #{post.userId}</span>
                        <span>Email: {post.authorEmail ?? "—"}</span>
                        <span>Posted: {format(new Date(post.createdAt), "dd MMM yyyy, HH:mm")}</span>
                      </div>
                    </div>

                    {/* Comments & admin comment box */}
                    <div className="border-t border-border/40">
                      <PostCommentsPanel post={post} />
                    </div>
                  </>
                )}

                {/* Action bar */}
                <div className="border-t border-border/40 px-4 py-2.5 bg-muted/10 flex items-center gap-2 flex-wrap">
                  {/* Hide / Restore */}
                  {post.status === "visible" || post.status === "spam" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => hidePost.mutate(post.id)}
                      disabled={hidePost.isPending}
                      className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Hide Post
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restorePost.mutate(post.id)}
                      disabled={restorePost.isPending}
                      className="gap-1.5 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
                    >
                      <Eye className="w-3.5 h-3.5" /> Restore
                    </Button>
                  )}

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDelete(post)}
                    disabled={deletePost.isPending}
                    className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Post
                  </Button>

                  {/* Ban / Unban author */}
                  <div className="ml-auto">
                    {post.communityBanned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unbanUser.mutate(post.userId)}
                        disabled={unbanUser.isPending}
                        className="gap-1.5 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        <ShieldOff className="w-3.5 h-3.5" /> Unban Author
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => banUser.mutate(post.userId)}
                        disabled={banUser.isPending}
                        className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Ban className="w-3.5 h-3.5" /> Ban Author
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Info box ── */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300/80">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Moderation Guide</p>
              <ul className="list-disc list-inside text-xs text-amber-300/70 space-y-0.5">
                <li><strong>Expand a post</strong> — click the chevron icon to see full content, comments, and admin controls.</li>
                <li><strong>Add Admin Comment</strong> — posts as "Gamerbuddy Team" and is visible to all users immediately.</li>
                <li><strong>Pin Comment</strong> — pinned comments appear at the very top of the comment list for all users.</li>
                <li><strong>Hide Post</strong> — soft delete, invisible to users but kept in database. Reversible.</li>
                <li><strong>Delete Post</strong> — permanent, removes all comments and votes. Irreversible.</li>
                <li><strong>Ban Author</strong> — prevents the user from creating new community posts.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
