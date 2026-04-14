import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp,
  Send, Plus, X, Lightbulb, Users, AlertTriangle, ArrowUpDown,
  Flame, Clock, CornerDownRight, Shield, EyeOff, Trash2,
  CheckCircle2, AlertOctagon, Eye, ShieldAlert, Sparkles,
  CircleDashed, Loader2, Zap, Bug, Palette, HelpCircle, ChevronDown as ChevDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BASE = "/api";

/* ── Admin detection — user ID 1 or admin email ── */
const ADMIN_EMAILS = ["admin@gamerbuddy.com"];
function checkIsAdmin(user: { id: number; email?: string } | null): boolean {
  if (!user) return false;
  if (user.id === 1) return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

/* ── Link stripping ── */
const LINK_STRIP_RE = /(?:https?:\/\/\S+|www\.\S+|\b\S+\.(?:com|net|org|io|co|app|gg|tv|me|ly|link|xyz|info|gov|edu)(?:\/\S*)?)/gi;
function stripLinks(text: string): { clean: string; stripped: boolean } {
  const clean = text.replace(LINK_STRIP_RE, "").replace(/ {2,}/g, " ");
  return { clean, stripped: clean !== text };
}

/* ── Types ── */
type SuggestionStatus = "visible" | "hidden" | "spam";

type SuggestionCategory = "feature" | "bug" | "ui" | "other";

const CATEGORY_CONFIG: Record<SuggestionCategory, {
  label: string;
  Icon: React.FC<{ className?: string }>;
  bg: string;
  border: string;
  color: string;
}> = {
  feature: { label: "Feature Request", Icon: Zap,         bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.40)", color: "#c084fc" },
  bug:     { label: "Bug Report",      Icon: Bug,         bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.38)",  color: "#f87171" },
  ui:      { label: "UI Improvement",  Icon: Palette,     bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.38)", color: "#22d3ee" },
  other:   { label: "Other",           Icon: HelpCircle,  bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.35)",color: "#94a3b8" },
};

const CATEGORY_OPTIONS: { value: SuggestionCategory; label: string }[] = [
  { value: "feature", label: "Feature Request" },
  { value: "bug",     label: "Bug Report"      },
  { value: "ui",      label: "UI Improvement"  },
  { value: "other",   label: "Other"           },
];

type Suggestion = {
  id: number;
  title: string;
  body: string;
  status: SuggestionStatus;
  category: SuggestionCategory;
  createdAt: string;
  userId: number;
  authorName: string;
  likes: number;
  dislikes: number;
  commentCount: number;
  myVote: "up" | "down" | null;
};

type Comment = {
  id: number;
  suggestionId: number;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  authorName: string;
  replies: Comment[];
};

/* ── API helpers ── */
async function fetchSuggestions(sort: string): Promise<Suggestion[]> {
  const r = await fetch(`${BASE}/community/suggestions?sort=${sort}`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load suggestions");
  return r.json();
}

async function fetchComments(suggestionId: number): Promise<Comment[]> {
  const r = await fetch(`${BASE}/community/suggestions/${suggestionId}/comments`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load comments");
  return r.json();
}

/* ── Avatar letter ── */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  const hue = (name?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center font-extrabold text-white shrink-0 uppercase"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue},60%,40%)` }}
    >
      {letter}
    </div>
  );
}

/* ── Inline notice ── */
function LinkRemovedNotice() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] animate-in fade-in slide-in-from-top-1 duration-200"
      style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)", color: "rgba(251,191,36,0.90)" }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      For safety, external links are not allowed and have been removed.
    </div>
  );
}

/* ── Status badge — shown for non-visible on public cards ── */
function StatusBadge({ status }: { status: SuggestionStatus }) {
  if (status === "visible") return null;
  if (status === "hidden") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#fbbf24" }}>
      <EyeOff className="h-2.5 w-2.5" /> Hidden
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
      <AlertOctagon className="h-2.5 w-2.5" /> Spam
    </span>
  );
}

/* ── Category badge ── */
function CategoryBadge({ category, size = "md" }: { category: SuggestionCategory; size?: "sm" | "md" }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  const glowAlpha = cfg.bg.replace(/[\d.]+\)$/, "0.28)");
  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        <cfg.Icon className="h-2.5 w-2.5" />
        {cfg.label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 tracking-wide"
      style={{
        background: `linear-gradient(135deg, ${cfg.bg}, ${cfg.bg.replace(/[\d.]+\)$/, "0.07)")})`,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        boxShadow: `0 0 10px ${glowAlpha}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <cfg.Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

/* ── Admin status pill — shows current moderation state clearly ── */
const STATUS_CONFIG: Record<SuggestionStatus, {
  label: string;
  Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  bg: string;
  border: string;
  color: string;
  glow: string;
}> = {
  visible: {
    label: "Approved",
    Icon: CheckCircle2,
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.35)",
    color: "#4ade80",
    glow: "rgba(34,197,94,0.15)",
  },
  hidden: {
    label: "Hidden",
    Icon: EyeOff,
    bg: "rgba(234,179,8,0.10)",
    border: "rgba(234,179,8,0.35)",
    color: "#fbbf24",
    glow: "rgba(234,179,8,0.12)",
  },
  spam: {
    label: "Spam",
    Icon: AlertOctagon,
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.35)",
    color: "#f87171",
    glow: "rgba(239,68,68,0.12)",
  },
};

function AdminStatusPill({ status }: { status: SuggestionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, boxShadow: `0 0 10px ${cfg.glow}` }}
    >
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/* ── Comment thread ── */
function CommentItem({ comment, suggestionId, depth = 0 }: { comment: Comment; suggestionId: number; depth?: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyStripped, setReplyStripped] = useState(false);

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`${BASE}/community/suggestions/${suggestionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, parentId: comment.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to post reply");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", suggestionId] });
      setReplyText("");
      setReplying(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className={depth > 0 ? "pl-4 border-l border-border/25" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar name={comment.authorName} size={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-bold text-white">{comment.authorName}</span>
            <span className="text-[10px] text-muted-foreground/45">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground/75 leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {comment.body}
          </p>
          {user && depth === 0 && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-primary/50 hover:text-primary transition-colors"
            >
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
          )}
          {replying && (
            <div className="mt-2.5 space-y-2 pl-1">
              <textarea
                value={replyText}
                onChange={(e) => {
                  const { clean, stripped } = stripLinks(e.target.value);
                  setReplyText(clean);
                  setReplyStripped(stripped);
                }}
                placeholder="Write a reply..."
                rows={2}
                maxLength={500}
                className="w-full rounded-lg px-3 py-2 text-[12px] resize-none outline-none transition-all bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50"
              />
              {replyStripped && <LinkRemovedNotice />}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-[11px] px-3" disabled={!replyText.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate(replyText.trim())}>
                  <Send className="h-3 w-3 mr-1" /> Reply
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setReplying(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="ml-8 space-y-0">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} suggestionId={suggestionId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Comments panel ── */
function CommentsPanel({ suggestion }: { suggestion: Suggestion }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commentStripped, setCommentStripped] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", suggestion.id],
    queryFn: () => fetchComments(suggestion.id),
  });

  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`${BASE}/community/suggestions/${suggestion.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to post comment");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", suggestion.id] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      setCommentText("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="border-t px-4 sm:px-5 py-4 space-y-4" style={{ borderColor: "rgba(168,85,247,0.12)", background: "rgba(0,0,0,0.25)" }}>
      {user && (
        <div className="space-y-2">
          <textarea
            value={commentText}
            onChange={(e) => {
              const { clean, stripped } = stripLinks(e.target.value);
              setCommentText(clean);
              setCommentStripped(stripped);
            }}
            placeholder="Share your thoughts on this suggestion..."
            rows={2}
            maxLength={500}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] resize-none outline-none transition-all bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50"
          />
          {commentStripped && <LinkRemovedNotice />}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/35">{commentText.length}/500</span>
            <Button size="sm" className="h-8 text-[12px] px-4" disabled={!commentText.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate(commentText.trim())}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Post Comment
            </Button>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-[12px] text-muted-foreground/50 text-center py-1">
          <Link href="/login" className="text-primary hover:underline">Log in</Link> to leave a comment.
        </p>
      )}

      {isLoading && <div className="text-[12px] text-muted-foreground/40 text-center py-3 animate-pulse">Loading comments…</div>}

      {!isLoading && comments.length === 0 && (
        <p className="text-[12px] text-muted-foreground/40 text-center py-2">No comments yet — be the first!</p>
      )}

      {comments.length > 0 && (
        <div className="divide-y divide-border/15 -mt-1">
          {comments.map((c) => <CommentItem key={c.id} comment={c} suggestionId={suggestion.id} />)}
        </div>
      )}
    </div>
  );
}

/* ── Admin moderation toolbar ── */
function AdminToolbar({ suggestion }: { suggestion: Suggestion }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const moderateMutation = useMutation({
    mutationFn: async (action: "approve" | "hide" | "spam") => {
      const r = await fetch(`${BASE}/community/suggestions/${suggestion.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Moderation failed");
      return data;
    },
    onSuccess: (_data, action) => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      const labels: Record<string, string> = { approve: "Approved — now visible to everyone", hide: "Hidden from public feed", spam: "Flagged as spam" };
      toast({ title: labels[action] ?? "Status updated" });
    },
    onError: (e: Error) => toast({ title: "Moderation failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/community/suggestions/${suggestion.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Delete failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      toast({ title: "Suggestion permanently deleted" });
      setDeleteOpen(false);
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const busy = moderateMutation.isPending || deleteMutation.isPending;
  const cur = suggestion.status;

  type StatusOption = { action: "approve" | "hide" | "spam"; status: SuggestionStatus; label: string; desc: string; Icon: React.FC<{ className?: string }>; activeBg: string; activeBorder: string; activeColor: string; activeGlow: string };
  const STATUS_OPTIONS: StatusOption[] = [
    {
      action: "approve", status: "visible",
      label: "Approve",  desc: "Publish to all users",
      Icon: CheckCircle2,
      activeBg: "rgba(34,197,94,0.16)", activeBorder: "rgba(34,197,94,0.55)", activeColor: "#4ade80", activeGlow: "0 0 14px rgba(34,197,94,0.20)",
    },
    {
      action: "hide", status: "hidden",
      label: "Hide",     desc: "Remove from public feed",
      Icon: EyeOff,
      activeBg: "rgba(234,179,8,0.14)", activeBorder: "rgba(234,179,8,0.50)", activeColor: "#fbbf24", activeGlow: "0 0 14px rgba(234,179,8,0.18)",
    },
    {
      action: "spam", status: "spam",
      label: "Flag Spam", desc: "Mark as spam & hide",
      Icon: AlertOctagon,
      activeBg: "rgba(239,68,68,0.14)", activeBorder: "rgba(239,68,68,0.50)", activeColor: "#f87171", activeGlow: "0 0 14px rgba(239,68,68,0.18)",
    },
  ];

  return (
    <div
      className="border-t"
      style={{ borderColor: "rgba(168,85,247,0.14)", background: "rgba(8,3,18,0.70)" }}
    >
      {/* ── Header strip ── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(168,85,247,0.10)", background: "rgba(168,85,247,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary/60">Admin Actions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/35">Current:</span>
          <AdminStatusPill status={cur} />
        </div>
      </div>

      {/* ── Status selector ── */}
      <div className="px-4 pt-3 pb-2.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/35 mb-2">
          Set Status
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map(({ action, status, label, desc, Icon, activeBg, activeBorder, activeColor, activeGlow }) => {
            const isCurrent = cur === status;
            const isLoading = moderateMutation.isPending && moderateMutation.variables === action;
            return (
              <button
                key={action}
                onClick={() => !isCurrent && moderateMutation.mutate(action)}
                disabled={busy || isCurrent}
                className="relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-all duration-150 active:scale-95 disabled:cursor-default"
                style={isCurrent ? {
                  background: activeBg,
                  border: `1.5px solid ${activeBorder}`,
                  color: activeColor,
                  boxShadow: activeGlow,
                } : {
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.35)",
                }}
                title={isCurrent ? `Currently: ${label}` : desc}
              >
                {isCurrent && (
                  <span
                    className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: activeColor, boxShadow: `0 0 4px ${activeColor}` }}
                  />
                )}
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Icon className="h-4 w-4" />
                }
                <span className="text-[11px] font-bold leading-none">{label}</span>
                <span className="text-[9px] leading-tight text-center opacity-60 font-medium">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div
        className="mx-4 mb-3 rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3"
        style={{ borderColor: "rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.04)" }}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400/60">Danger Zone</p>
          <p className="text-[11px] text-muted-foreground/45 mt-0.5">Permanently removes this suggestion and all comments.</p>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <button
              disabled={busy}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg shrink-0 transition-all duration-150 active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#f87171", boxShadow: "0 0 10px rgba(239,68,68,0.12)" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-red-500/30 max-w-md" style={{ background: "rgba(12,5,22,0.99)", boxShadow: "0 0 50px rgba(239,68,68,0.18)" }}>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.40)" }}
                >
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <AlertDialogTitle className="text-white text-[17px] font-extrabold">Delete Permanently?</AlertDialogTitle>
                  <p className="text-[11px] text-red-400/70 font-semibold mt-0.5">This cannot be undone</p>
                </div>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                    You are about to permanently delete{" "}
                    <span className="font-semibold text-white/90">"{suggestion.title}"</span>
                    {" "}along with all of its votes and comments.
                  </p>
                  <div
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}
                  >
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-300/80 leading-relaxed">
                      If you only want to hide this from the public,{" "}
                      <span className="font-bold text-red-200">use Hide or Flag Spam instead</span>{" "}
                      — those are reversible.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2 mt-1">
              <AlertDialogCancel className="border-border/50 text-muted-foreground hover:text-white flex-1 sm:flex-none">
                Cancel — Keep It
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="font-bold border-0 text-white flex-1 sm:flex-none"
                style={{ background: "linear-gradient(135deg,#dc2626,#991b1b)", boxShadow: "0 0 20px rgba(239,68,68,0.30)" }}
              >
                {deleteMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                  : <><Trash2 className="h-4 w-4 mr-2" />Yes, Delete Forever</>
                }
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ── Suggestion card ── */
function SuggestionCard({ suggestion, isAdmin }: { suggestion: Suggestion; isAdmin: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async (vote: "up" | "down") => {
      const r = await fetch(`${BASE}/community/suggestions/${suggestion.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vote }),
      });
      if (!r.ok) throw new Error("Vote failed");
      return r.json();
    },
    onSuccess: (data) => {
      qc.setQueryData<Suggestion[]>(["suggestions"], (old) =>
        old?.map((s) => {
          if (s.id !== suggestion.id) return s;
          const prev = suggestion.myVote;
          const next = data.myVote;
          let likes = s.likes;
          let dislikes = s.dislikes;
          if (prev === "up") likes--;
          if (prev === "down") dislikes--;
          if (next === "up") likes++;
          if (next === "down") dislikes++;
          return { ...s, myVote: next, likes, dislikes };
        })
      );
    },
    onError: () => toast({ title: "Log in to vote", variant: "destructive" }),
  });

  const score = suggestion.likes - suggestion.dislikes;
  const scoreColor = score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-muted-foreground/60";
  const catCfg = CATEGORY_CONFIG[suggestion.category ?? "other"] ?? CATEGORY_CONFIG.other;

  const borderColor = suggestion.status === "spam"
    ? "rgba(239,68,68,0.30)"
    : suggestion.status === "hidden"
    ? "rgba(234,179,8,0.25)"
    : suggestion.myVote === "up"
    ? "rgba(34,197,94,0.30)"
    : suggestion.myVote === "down"
    ? "rgba(239,68,68,0.22)"
    : "rgba(255,255,255,0.08)";

  const accentColor = suggestion.status === "spam"
    ? "#ef4444"
    : suggestion.status === "hidden"
    ? "#eab308"
    : catCfg.color;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200 hover:border-white/[0.13]"
      style={{
        background: "rgba(10,5,20,0.94)",
        borderColor,
        boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
        borderLeft: `3px solid ${accentColor}55`,
      }}
    >
      {/* Top accent line for non-visible */}
      {suggestion.status !== "visible" && (
        <div
          className="h-[2px]"
          style={{ background: suggestion.status === "spam" ? "linear-gradient(90deg,transparent,#ef4444,transparent)" : "linear-gradient(90deg,transparent,#eab308,transparent)" }}
        />
      )}

      {/* Card body */}
      <div className="flex gap-3 sm:gap-4 p-4 sm:p-5">
        {/* Score column */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <button
            onClick={() => user ? voteMutation.mutate("up") : toast({ title: "Log in to vote", variant: "destructive" })}
            className={`h-9 w-9 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              suggestion.myVote === "up"
                ? "bg-emerald-500/25 border border-emerald-500/55 text-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.20)]"
                : "border border-border/40 text-muted-foreground/55 hover:border-emerald-500/45 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <span className={`text-[13px] font-black tabular-nums leading-none ${scoreColor}`}>
            {score > 0 ? `+${score}` : score}
          </span>
          <button
            onClick={() => user ? voteMutation.mutate("down") : toast({ title: "Log in to vote", variant: "destructive" })}
            className={`h-9 w-9 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              suggestion.myVote === "down"
                ? "bg-red-500/20 border border-red-500/45 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.18)]"
                : "border border-border/40 text-muted-foreground/55 hover:border-red-400/45 hover:text-red-400 hover:bg-red-500/10"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-white leading-snug flex-1 min-w-0">{suggestion.title}</h3>
            <span className="text-[10px] text-muted-foreground/30 tabular-nums shrink-0 mt-0.5">
              {suggestion.likes}↑ {suggestion.dislikes}↓
            </span>
          </div>

          {/* Category + status badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <CategoryBadge category={suggestion.category ?? "other"} />
            <StatusBadge status={suggestion.status} />
          </div>

          <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-3 whitespace-pre-wrap break-words">
            {suggestion.body}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Avatar name={suggestion.authorName} size={20} />
              <span className="text-[11px] font-semibold text-white/60">{suggestion.authorName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/38">
              {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-95 rounded-lg px-2.5 py-1"
              style={expanded
                ? { background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.30)", color: "#c084fc" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }
              }
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{suggestion.commentCount} {suggestion.commentCount === 1 ? "comment" : "comments"}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && <CommentsPanel suggestion={suggestion} />}
      {isAdmin && <AdminToolbar suggestion={suggestion} />}
    </div>
  );
}

/* ── Submit form ── */
function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SuggestionCategory>("other");
  const [titleStripped, setTitleStripped] = useState(false);
  const [bodyStripped, setBodyStripped] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/community/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to post suggestion");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      setTitle("");
      setBody("");
      setCategory("other");
      setSubmitted(true);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (submitted) {
    return (
      <div
        className="rounded-2xl border p-8 flex flex-col items-center gap-4 text-center"
        style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.06) 0%,rgba(0,0,0,0.3) 100%)", borderColor: "rgba(34,197,94,0.30)" }}
      >
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)" }}
        >
          <CheckCircle2 className="h-7 w-7 text-green-400" strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-lg font-extrabold text-green-400">Thank you for your suggestion!</div>
          <div className="text-sm text-muted-foreground mt-1">
            Your idea has been shared with the community. Others can now vote and comment on it.
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <Button variant="outline" size="sm" className="text-xs border-border/50" onClick={() => { setSubmitted(false); onSuccess(); }}>
            Close Form
          </Button>
          <Button size="sm" className="text-xs" style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.40)", color: "#c084fc" }} onClick={() => setSubmitted(false)}>
            <Plus className="h-3 w-3 mr-1" /> Add Another Idea
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitMutation.isPending;
  const anyStripped = titleStripped || bodyStripped;

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{
        background: "linear-gradient(135deg,rgba(168,85,247,0.07) 0%,rgba(0,0,0,0.3) 100%)",
        borderColor: "rgba(168,85,247,0.35)",
        boxShadow: "0 0 0 1px rgba(168,85,247,0.08), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.40)" }}>
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-[13px] font-bold text-white">New Suggestion</span>
      </div>

      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => { const { clean, stripped } = stripLinks(e.target.value); setTitle(clean); setTitleStripped(stripped); }}
            placeholder="Short, clear title for your idea…"
            maxLength={120}
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-all bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60"
          />
          <div className="flex justify-end mt-1 px-1">
            <span className="text-[10px] text-muted-foreground/30">{title.length}/120</span>
          </div>
        </div>

        {/* Category pill picker */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Category</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map(({ value, label }) => {
              const cfg = CATEGORY_CONFIG[value];
              const active = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150 active:scale-95"
                  style={active ? {
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    color: cfg.color,
                    boxShadow: `0 0 10px ${cfg.bg}`,
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.40)",
                  }}
                >
                  <cfg.Icon className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <textarea
            value={body}
            onChange={(e) => { const { clean, stripped } = stripLinks(e.target.value); setBody(clean); setBodyStripped(stripped); }}
            placeholder="Describe your suggestion in detail. What problem does it solve? How would it work?"
            rows={4}
            maxLength={1000}
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] resize-none outline-none transition-all bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60"
          />
          <div className="flex justify-end mt-1 px-1">
            <span className="text-[10px] text-muted-foreground/30">{body.length}/1000</span>
          </div>
        </div>

        {anyStripped && <LinkRemovedNotice />}

        <Button
          className="w-full font-bold"
          disabled={!canSubmit}
          onClick={() => submitMutation.mutate()}
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}
        >
          <Send className="h-4 w-4 mr-2" />
          {submitMutation.isPending ? "Posting…" : "Post Suggestion"}
        </Button>
      </div>
    </div>
  );
}

/* ── Sort tabs ── */
const SORTS = [
  { value: "newest",    label: "Newest",         Icon: Clock         },
  { value: "liked",     label: "Most Liked",      Icon: Flame         },
  { value: "discussed", label: "Most Commented",  Icon: MessageSquare },
] as const;
type Sort = typeof SORTS[number]["value"];

/* ── Admin moderation queue ── */
function AdminQueue({ suggestions, isAdmin }: { suggestions: Suggestion[]; isAdmin: boolean }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"pending" | "hidden" | "spam">("pending");

  if (!isAdmin) return null;

  const hidden  = suggestions.filter((s) => s.status === "hidden");
  const spam    = suggestions.filter((s) => s.status === "spam");
  const pending = suggestions.filter((s) => s.status !== "visible");
  const visible = suggestions.filter((s) => s.status === "visible");
  const totalPending = pending.length;

  const tabItems = tab === "hidden" ? hidden : tab === "spam" ? spam : pending;

  const STATS = [
    { label: "Live",    count: visible.length, cfg: STATUS_CONFIG.visible, desc: "visible to all users" },
    { label: "Hidden",  count: hidden.length,  cfg: STATUS_CONFIG.hidden,  desc: "removed from feed"   },
    { label: "Spam",    count: spam.length,     cfg: STATUS_CONFIG.spam,    desc: "flagged & hidden"    },
  ];

  const TABS: { value: "pending" | "hidden" | "spam"; label: string; count: number; dotColor: string }[] = [
    { value: "pending", label: "All Pending", count: totalPending, dotColor: "#a855f7" },
    { value: "hidden",  label: "Hidden",      count: hidden.length, dotColor: "#fbbf24" },
    { value: "spam",    label: "Spam",         count: spam.length,   dotColor: "#f87171" },
  ];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: totalPending > 0 ? "rgba(168,85,247,0.50)" : "rgba(168,85,247,0.28)",
        background: "rgba(6,3,15,0.90)",
        boxShadow: totalPending > 0
          ? "0 0 40px rgba(168,85,247,0.12), inset 0 1px 0 rgba(168,85,247,0.12)"
          : "0 0 24px rgba(0,0,0,0.40)",
      }}
    >
      {/* ── Collapsible header ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.28),rgba(168,85,247,0.10))", border: "1px solid rgba(168,85,247,0.55)" }}
          >
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-extrabold text-white tracking-tight">Moderation Queue</span>
              {totalPending > 0 ? (
                <span
                  className="text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse"
                  style={{ background: "rgba(239,68,68,0.22)", border: "1px solid rgba(239,68,68,0.50)", color: "#f87171" }}
                >
                  {totalPending} need{totalPending === 1 ? "s" : ""} review
                </span>
              ) : (
                <span
                  className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.30)", color: "#4ade80" }}
                >
                  All clear
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground/45 mt-0.5">
              Admin-only panel · {suggestions.length} total suggestion{suggestions.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-primary/45 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-primary/45 shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: "rgba(168,85,247,0.14)" }}>

          {/* ── Stats row ── */}
          <div
            className="grid grid-cols-3"
            style={{ borderBottom: "1px solid rgba(168,85,247,0.12)" }}
          >
            {STATS.map(({ label, count, cfg, desc }, i) => (
              <div
                key={label}
                className="flex flex-col items-center py-4 gap-1.5"
                style={{ borderRight: i < 2 ? "1px solid rgba(168,85,247,0.10)" : "none" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tabular-nums" style={{ color: cfg.color }}>{count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <cfg.Icon className="h-3 w-3 shrink-0" style={{ color: cfg.color }} />
                  <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{label}</span>
                </div>
                <span className="text-[9px] text-muted-foreground/35 font-medium text-center leading-tight px-2">{desc}</span>
              </div>
            ))}
          </div>

          {/* ── Tab bar ── */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(168,85,247,0.10)", background: "rgba(0,0,0,0.20)" }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mr-1 shrink-0">
              Filter:
            </span>
            {TABS.map(({ value, label, count, dotColor }) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95"
                  style={active ? {
                    background: "rgba(168,85,247,0.18)",
                    border: "1px solid rgba(168,85,247,0.45)",
                    color: "#c084fc",
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.38)",
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black"
                      style={active
                        ? { background: "rgba(168,85,247,0.30)", color: "#e9d5ff" }
                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }
                      }
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          <div className="p-4 space-y-3">
            {totalPending === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.28)" }}
                >
                  <CheckCircle2 className="h-7 w-7 text-green-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[15px] font-extrabold text-white/75">Queue is empty!</div>
                  <div className="text-[12px] text-muted-foreground/40 mt-1 max-w-[220px] leading-relaxed">
                    All {visible.length} suggestion{visible.length !== 1 ? "s" : ""} are live. Nothing needs moderation right now.
                  </div>
                </div>
              </div>
            ) : tabItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[12px] text-muted-foreground/40">No <span className="font-semibold">{tab}</span> items at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/35 px-1">
                  {tabItems.length} item{tabItems.length !== 1 ? "s" : ""} — click a card to expand and take action
                </p>
                {tabItems.map((s) => <SuggestionCard key={s.id} suggestion={s} isAdmin={isAdmin} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function CommunityPage() {
  const { user } = useAuth();
  const [sort, setSort] = useState<Sort>("newest");
  const [showForm, setShowForm] = useState(false);
  const isAdmin = checkIsAdmin(user as any);

  const { data: suggestions = [], isLoading, isError } = useQuery({
    queryKey: ["suggestions", sort],
    queryFn: () => fetchSuggestions(sort),
  });

  const visibleSuggestions = isAdmin ? suggestions.filter((s) => s.status === "visible") : suggestions;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Subtle bg glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{ background: "radial-gradient(ellipse 55% 35% at 30% 15%,rgba(168,85,247,0.10) 0%,transparent 60%)" }}
      />

      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
            style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.30)", color: "#c084fc" }}
          >
            Community
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
              <span className="flex items-center gap-3">
                <Users className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
                Community
              </span>
              <span className="text-primary text-2xl md:text-3xl">Suggestions</span>
            </h1>
            <p className="text-muted-foreground/70 mt-2 text-sm leading-relaxed">
              Share ideas, vote on your favourites, and discuss with the community.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {user && !showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="font-bold whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 18px rgba(168,85,247,0.32)" }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> New Idea
              </Button>
            )}
            {user && showForm && (
              <Button onClick={() => setShowForm(false)} variant="outline" className="font-bold border-border/50 whitespace-nowrap">
                <X className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
            )}
            {!user && (
              <Button asChild variant="outline" className="font-semibold border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap">
                <Link href="/login">Log in to suggest</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit form (collapsible) ── */}
      {showForm && user && <SubmitForm onSuccess={() => setShowForm(false)} />}

      {/* ── Admin moderation queue ── */}
      {isAdmin && !isLoading && <AdminQueue suggestions={suggestions} isAdmin={isAdmin} />}

      {/* ── Link safety banner ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
        style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", color: "rgba(251,191,36,0.55)" }}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span>External links are automatically removed for safety.</span>
      </div>

      {/* ── Sort tabs ── */}
      <div
        className="flex items-center p-1 gap-1 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {SORTS.map(({ value, label, Icon }) => {
          const active = sort === value;
          return (
            <button
              key={value}
              onClick={() => setSort(value)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-3 sm:py-2.5 rounded-lg text-[12px] font-bold transition-all duration-200 active:scale-95"
              style={active ? {
                background: "linear-gradient(135deg,rgba(168,85,247,0.28),rgba(168,85,247,0.18))",
                border: "1px solid rgba(168,85,247,0.55)",
                color: "#c084fc",
                boxShadow: "0 0 16px rgba(168,85,247,0.20)",
              } : {
                color: "rgba(255,255,255,0.42)",
                border: "1px solid transparent",
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
        <span
          className="text-[11px] font-semibold tabular-nums whitespace-nowrap px-2.5 py-1 rounded-lg ml-1 shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.30)" }}
        >
          {visibleSuggestions.length}
        </span>
      </div>

      {/* ── Feed ── */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/20 bg-card/30 h-36 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-10 text-center">
          <div className="text-red-400 font-bold">Failed to load suggestions</div>
          <div className="text-sm text-muted-foreground mt-1">Check your connection and try refreshing.</div>
        </div>
      )}

      {!isLoading && !isError && visibleSuggestions.length === 0 && (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.03)" }}
        >
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <Lightbulb className="h-7 w-7 text-primary/70" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-base font-bold text-white/70">No suggestions yet</div>
            <div className="text-sm text-muted-foreground/50 mt-1">Be the first to share an idea!</div>
          </div>
          {user ? (
            <Button size="sm" onClick={() => setShowForm(true)} style={{ background: "rgba(168,85,247,0.20)", border: "1px solid rgba(168,85,247,0.40)", color: "#c084fc" }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Post an Idea
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="border-primary/35 text-primary">
              <Link href="/login">Log in to post</Link>
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && visibleSuggestions.length > 0 && (
        <div className="space-y-4">
          {visibleSuggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
