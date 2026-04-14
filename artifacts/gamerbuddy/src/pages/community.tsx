import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp,
  Send, Plus, X, Lightbulb, Users, AlertTriangle, ArrowUpDown,
  Flame, Clock, CornerDownRight, Shield, EyeOff, Trash2,
  CheckCircle2, AlertOctagon, Eye, ShieldAlert, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

type Suggestion = {
  id: number;
  title: string;
  body: string;
  status: SuggestionStatus;
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

/* ── Status badge ── */
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
    <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: "rgba(168,85,247,0.10)", background: "rgba(0,0,0,0.20)" }}>
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suggestions"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
      toast({ title: "Suggestion deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const busy = moderateMutation.isPending || deleteMutation.isPending;

  return (
    <div
      className="border-t px-4 py-2.5 flex flex-wrap items-center gap-2"
      style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.04)" }}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/40 flex items-center gap-1 mr-1">
        <Shield className="h-3 w-3" /> Admin
      </span>

      {suggestion.status !== "visible" && (
        <button
          onClick={() => moderateMutation.mutate("approve")}
          disabled={busy}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}
        >
          <Eye className="h-3 w-3" /> Approve
        </button>
      )}

      {suggestion.status !== "hidden" && (
        <button
          onClick={() => moderateMutation.mutate("hide")}
          disabled={busy}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.30)", color: "#fbbf24" }}
        >
          <EyeOff className="h-3 w-3" /> Hide
        </button>
      )}

      {suggestion.status !== "spam" && (
        <button
          onClick={() => moderateMutation.mutate("spam")}
          disabled={busy}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171" }}
        >
          <AlertOctagon className="h-3 w-3" /> Flag Spam
        </button>
      )}

      <button
        onClick={() => {
          if (window.confirm("Permanently delete this suggestion and all its comments?")) {
            deleteMutation.mutate();
          }
        }}
        disabled={busy}
        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 ml-auto"
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
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

  const borderColor = suggestion.status === "spam"
    ? "rgba(239,68,68,0.25)"
    : suggestion.status === "hidden"
    ? "rgba(234,179,8,0.20)"
    : suggestion.myVote
    ? "rgba(168,85,247,0.35)"
    : "rgba(255,255,255,0.07)";

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ background: "rgba(12,7,22,0.92)", borderColor, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
    >
      {/* Top accent line for non-visible */}
      {suggestion.status !== "visible" && (
        <div
          className="h-[2px]"
          style={{ background: suggestion.status === "spam" ? "linear-gradient(90deg,transparent,#ef4444,transparent)" : "linear-gradient(90deg,transparent,#eab308,transparent)" }}
        />
      )}

      {/* Card body */}
      <div className="flex gap-4 p-5">
        {/* Score column */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <button
            onClick={() => user ? voteMutation.mutate("up") : toast({ title: "Log in to vote", variant: "destructive" })}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90 ${
              suggestion.myVote === "up"
                ? "bg-emerald-500/25 border border-emerald-500/50 text-emerald-400"
                : "border border-border/40 text-muted-foreground/60 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <span className={`text-[13px] font-extrabold tabular-nums leading-none ${scoreColor}`}>
            {score > 0 ? `+${score}` : score}
          </span>
          <button
            onClick={() => user ? voteMutation.mutate("down") : toast({ title: "Log in to vote", variant: "destructive" })}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90 ${
              suggestion.myVote === "down"
                ? "bg-red-500/20 border border-red-500/40 text-red-400"
                : "border border-border/40 text-muted-foreground/60 hover:border-red-400/40 hover:text-red-400 hover:bg-red-500/10"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold text-white leading-snug">{suggestion.title}</h3>
              <StatusBadge status={suggestion.status} />
            </div>
            <span className="text-[10px] text-muted-foreground/35 tabular-nums shrink-0">
              {suggestion.likes}↑ {suggestion.dislikes}↓
            </span>
          </div>

          <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-2 whitespace-pre-wrap break-words">
            {suggestion.body}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-3.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Avatar name={suggestion.authorName} size={18} />
              <span className="text-[11px] font-semibold text-white/65">{suggestion.authorName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40">
              {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/55 hover:text-primary transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {suggestion.commentCount} {suggestion.commentCount === 1 ? "comment" : "comments"}
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
  const [titleStripped, setTitleStripped] = useState(false);
  const [bodyStripped, setBodyStripped] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/community/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to post suggestion");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      setTitle("");
      setBody("");
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
  const pending = suggestions.filter((s) => s.status !== "visible");
  if (!isAdmin || pending.length === 0) return null;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(168,85,247,0.45)", background: "rgba(168,85,247,0.04)", boxShadow: "0 0 24px rgba(168,85,247,0.08)" }}
    >
      {/* Queue header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.20)", border: "1px solid rgba(168,85,247,0.45)" }}
          >
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              Admin Moderation Tools
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.45)", color: "#c084fc" }}
              >
                {pending.length} pending
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground/60">Visible only to the platform owner</div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-primary/60" /> : <ChevronDown className="h-4 w-4 text-primary/60" />}
      </button>

      {open && (
        <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: "rgba(168,85,247,0.15)" }}>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
            The following suggestions are hidden from public view. Use the controls on each card to approve, hide, flag as spam, or delete.
          </p>
          <div className="space-y-3">
            {pending.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} isAdmin={isAdmin} />
            ))}
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Subtle bg glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{ background: "radial-gradient(ellipse 55% 35% at 30% 15%,rgba(168,85,247,0.10) 0%,transparent 60%)" }}
      />

      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 border border-primary/25 rounded-full px-2.5 py-1">
            Community
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
              <span className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary shrink-0" />
                Community
              </span>
              <span className="text-primary text-2xl md:text-3xl">Suggestions</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-md">
              Help us improve Gamerbuddy — share ideas, vote on your favourites, and discuss with the community.
            </p>
          </div>

          {user && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="shrink-0 font-bold"
              style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 16px rgba(168,85,247,0.30)" }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> New Idea
            </Button>
          )}

          {user && showForm && (
            <Button onClick={() => setShowForm(false)} variant="outline" className="shrink-0 font-bold border-border/50">
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          )}

          {!user && (
            <Button asChild variant="outline" className="shrink-0 font-semibold border-primary/40 text-primary hover:bg-primary/10">
              <Link href="/login">Log in to suggest</Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Submit form (collapsible) ── */}
      {showForm && user && <SubmitForm onSuccess={() => setShowForm(false)} />}

      {/* ── Admin moderation queue ── */}
      {isAdmin && !isLoading && <AdminQueue suggestions={suggestions} isAdmin={isAdmin} />}

      {/* ── Link safety banner ── */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px]"
        style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", color: "rgba(251,191,36,0.65)" }}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        For safety, external links are not allowed in the community. Any URLs you type will be automatically removed.
      </div>

      {/* ── Sort tabs ── */}
      <div
        className="flex items-center p-1 gap-1 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {SORTS.map(({ value, label, Icon }) => {
          const active = sort === value;
          return (
            <button
              key={value}
              onClick={() => setSort(value)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 active:scale-95"
              style={active ? {
                background: "rgba(168,85,247,0.22)",
                border: "1px solid rgba(168,85,247,0.50)",
                color: "#c084fc",
                boxShadow: "0 0 14px rgba(168,85,247,0.18)",
              } : {
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </button>
          );
        })}
        <span className="ml-2 text-[11px] text-muted-foreground/35 tabular-nums whitespace-nowrap pr-1">
          {visibleSuggestions.length} {visibleSuggestions.length === 1 ? "idea" : "ideas"}
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
        <div className="space-y-3">
          {visibleSuggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
