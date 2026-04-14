import React from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useUserProfile, useProfileVotes, useVoteOnProfile,
  STREAMING_PLATFORM_META,
} from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { VerifiedBadge } from "@/components/verified-badge";
import { TrustMeter, ReputationBadges, computeBadges } from "@/components/reputation-badges";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, Star, Swords, Gamepad2, Target, Zap } from "lucide-react";

/* ── Rank badges (mirrored from profile.tsx) ─────────────────────── */
const RANK_BADGES = [
  { min: 0,    label: "Rookie",      emoji: "🌱", color: "text-gray-400" },
  { min: 100,  label: "Apprentice",  emoji: "⚔️",  color: "text-blue-400" },
  { min: 300,  label: "Challenger",  emoji: "🔥", color: "text-orange-400" },
  { min: 600,  label: "Expert",      emoji: "💎", color: "text-cyan-400" },
  { min: 1000, label: "Elite",       emoji: "👑", color: "text-yellow-400" },
  { min: 2000, label: "Legend",      emoji: "⭐", color: "text-purple-400" },
];

const BG_STYLES: Record<string, string> = {
  "bg-neon-purple":  "from-purple-600/30 via-violet-900/20 to-background",
  "bg-cyber-blue":   "from-cyan-500/25 via-blue-900/20 to-background",
  "bg-fire-red":     "from-red-600/30 via-orange-900/20 to-background",
  "bg-matrix-green": "from-green-600/25 via-emerald-900/20 to-background",
  "bg-gold-rush":    "from-yellow-500/30 via-amber-900/20 to-background",
  "bg-arctic":       "from-sky-400/20 via-blue-900/15 to-background",
  "bg-void":         "from-gray-900/80 via-zinc-900/50 to-background",
};

/* ── Like / Dislike panel ────────────────────────────────────────── */
function VotePanel({ profileId }: { profileId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: votes, isLoading } = useProfileVotes(user ? profileId : null);
  const voteMutation = useVoteOnProfile(profileId);

  if (!user || isLoading) return null;

  const handleVote = (voteType: "like" | "dislike") => {
    if (!votes?.canVote || votes?.myVote !== null) return;
    voteMutation.mutate(voteType, {
      onSuccess: () =>
        toast({
          title: "Thank you for your feedback!",
          description: voteType === "like"
            ? "Your like has been recorded and helps the community."
            : "Your dislike has been recorded and helps the community.",
        }),
      onError: (err: any) =>
        toast({ title: "Couldn't vote", description: err?.error ?? "Something went wrong", variant: "destructive" }),
    });
  };

  const likes         = votes?.likes    ?? 0;
  const dislikes      = votes?.dislikes ?? 0;
  const myVote        = votes?.myVote   ?? null;
  const canVote       = votes?.canVote  ?? false;
  const isSelf        = user.id === profileId;
  const pending       = voteMutation.isPending;
  const alreadyVoted  = myVote !== null;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Summary bar — always shown */}
      <div className="flex items-center justify-center gap-2 px-6 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-lg">👍</span>
        <span className="text-xl font-black text-green-400 tabular-nums">{likes}</span>
        <span className="text-muted-foreground/40 font-bold mx-1">•</span>
        <span className="text-lg">👎</span>
        <span className="text-xl font-black text-red-400 tabular-nums">{dislikes}</span>
      </div>

      <div className="p-4 space-y-3">
        {canVote ? (
          <>
            <div className="flex gap-3">
              {/* Like button */}
              <VoteButton
                emoji="👍"
                label="Like"
                count={likes}
                active={myVote === "like"}
                locked={alreadyVoted && myVote !== "like"}
                disabled={pending || alreadyVoted}
                activeStyle={{
                  bg: "rgba(34,197,94,0.18)",
                  border: "rgba(74,222,128,0.60)",
                  text: "#4ade80",
                  glow: "0 0 24px rgba(34,197,94,0.35), 0 0 8px rgba(34,197,94,0.20)",
                  countColor: "#4ade80",
                }}
                inactiveStyle={{
                  bg: "rgba(34,197,94,0.04)",
                  border: "rgba(74,222,128,0.18)",
                  text: "rgba(74,222,128,0.55)",
                  hoverBg: "rgba(34,197,94,0.12)",
                  hoverBorder: "rgba(74,222,128,0.40)",
                  hoverText: "#4ade80",
                  countColor: "rgba(74,222,128,0.45)",
                }}
                onClick={() => handleVote("like")}
              />
              {/* Dislike button */}
              <VoteButton
                emoji="👎"
                label="Dislike"
                count={dislikes}
                active={myVote === "dislike"}
                locked={alreadyVoted && myVote !== "dislike"}
                disabled={pending || alreadyVoted}
                activeStyle={{
                  bg: "rgba(239,68,68,0.18)",
                  border: "rgba(248,113,113,0.60)",
                  text: "#f87171",
                  glow: "0 0 24px rgba(239,68,68,0.35), 0 0 8px rgba(239,68,68,0.20)",
                  countColor: "#f87171",
                }}
                inactiveStyle={{
                  bg: "rgba(239,68,68,0.04)",
                  border: "rgba(248,113,113,0.18)",
                  text: "rgba(248,113,113,0.55)",
                  hoverBg: "rgba(239,68,68,0.12)",
                  hoverBorder: "rgba(248,113,113,0.40)",
                  hoverText: "#f87171",
                  countColor: "rgba(248,113,113,0.45)",
                }}
                onClick={() => handleVote("dislike")}
              />
            </div>
            {alreadyVoted ? (
              <div
                className="rounded-xl px-4 py-3 text-center space-y-0.5"
                style={{
                  background: myVote === "like"
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(239,68,68,0.08)",
                  border: `1px solid ${myVote === "like" ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                }}
              >
                <p className="text-sm font-bold" style={{ color: myVote === "like" ? "#4ade80" : "#f87171" }}>
                  Thank you for your feedback!
                </p>
                <p className="text-[10px] text-muted-foreground/50">
                  Only one vote per profile · Your vote helps the community.
                </p>
              </div>
            ) : (
              <p className="text-center text-[10px] text-muted-foreground/40">
                Only one vote allowed per profile
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-xs text-muted-foreground/50 py-1 italic">
            {isSelf
              ? "You can't vote on your own profile."
              : "Complete a session with this user to leave feedback."}
          </p>
        )}
      </div>
    </div>
  );
}

type VoteButtonStyle = {
  bg: string; border: string; text: string; glow: string; countColor: string;
};
type VoteButtonInactiveStyle = {
  bg: string; border: string; text: string;
  hoverBg: string; hoverBorder: string; hoverText: string; countColor: string;
};

function VoteButton({
  emoji, label, count, active, locked, disabled, activeStyle, inactiveStyle, onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  locked: boolean;
  disabled: boolean;
  activeStyle: VoteButtonStyle;
  inactiveStyle: VoteButtonInactiveStyle;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  // locked = other vote was chosen; active = this vote was chosen
  const canHover = !disabled && !locked && !active;

  const bg     = locked ? "rgba(255,255,255,0.02)"
               : active ? activeStyle.bg
               : hovered ? inactiveStyle.hoverBg : inactiveStyle.bg;
  const border = locked ? "rgba(255,255,255,0.06)"
               : active ? activeStyle.border
               : hovered ? inactiveStyle.hoverBorder : inactiveStyle.border;
  const text   = locked ? "rgba(255,255,255,0.2)"
               : active ? activeStyle.text
               : hovered ? inactiveStyle.hoverText : inactiveStyle.text;
  const cColor = locked ? "rgba(255,255,255,0.15)"
               : active ? activeStyle.countColor : inactiveStyle.countColor;
  const shadow = active ? activeStyle.glow : "none";
  const scale  = canHover && hovered ? "scale(1.03)" : "scale(1)";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "16px 12px",
        borderRadius: "16px",
        border: `1.5px solid ${border}`,
        background: bg,
        boxShadow: shadow,
        color: text,
        transform: scale,
        transition: "all 0.18s ease",
        cursor: locked || active ? "default" : disabled ? "not-allowed" : "pointer",
        opacity: locked ? 0.35 : 1,
        filter: locked ? "grayscale(0.6)" : "none",
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: "28px", lineHeight: 1 }}>{emoji}</span>
      {/* Count */}
      <span style={{
        fontSize: "22px",
        fontWeight: 900,
        lineHeight: 1,
        color: cColor,
        fontVariantNumeric: "tabular-nums",
        transition: "color 0.18s ease",
      }}>
        {count}
      </span>
      {/* Label */}
      <span style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: text,
        transition: "color 0.18s ease",
      }}>
        {active ? `${label}d ✓` : locked ? "—" : label}
      </span>
    </button>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const profileId = parseInt(id ?? "");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading } = useUserProfile(isNaN(profileId) ? null : profileId);

  if (isNaN(profileId)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        Invalid profile link.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        User not found.
      </div>
    );
  }

  const bgId = profile.profileBackground;
  const bgGrad = bgId ? (BG_STYLES[bgId] ?? "from-primary/15 via-secondary/10 to-background") : "from-primary/15 via-secondary/10 to-background";
  const points = profile.points;
  const currentRank = RANK_BADGES.filter((b) => points >= b.min).pop() ?? RANK_BADGES[0];
  const trustFactor = Math.min(100, profile.trustFactor);
  const repBadges = computeBadges({
    trustFactor,
    idVerified: profile.idVerified,
    sessionsAsGamerCount: profile.sessionsAsGamerCount ?? 0,
    sessionsAsHirerCount: profile.sessionsAsHirerCount ?? 0,
    beginnerFriendly: profile.beginnerFriendly ?? false,
  });

  const avgRating = profile.avgRating;
  const streamingAccounts = profile.streamingAccounts ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile banner */}
      <div
        className={`rounded-2xl border border-border overflow-hidden bg-gradient-to-br ${bgGrad}`}
        style={{ boxShadow: "0 0 40px rgba(168,85,247,0.06)" }}
      >
        {/* Header strip */}
        <div className="h-20 sm:h-24 bg-gradient-to-r from-primary/20 via-secondary/15 to-transparent relative">
          <div className="absolute bottom-0 right-4 flex items-center gap-1.5 pb-2">
            {streamingAccounts.map((sa) => {
              const meta = STREAMING_PLATFORM_META[sa.platform];
              if (!meta) return null;
              return (
                <a
                  key={sa.platform}
                  href={meta.urlTemplate.replace("{username}", sa.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
                  title={`${meta.label}: @${sa.username}`}
                >
                  <span>{meta.emoji}</span>
                  <span>@{sa.username}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary/40 flex items-center justify-center shrink-0 text-2xl font-black text-primary uppercase"
              style={{ background: "rgba(168,85,247,0.15)", backdropFilter: "blur(8px)" }}
            >
              {profile.name.charAt(0)}
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white truncate">{profile.name}</h1>
                <VerifiedBadge idVerified={profile.idVerified} variant="compact" />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-bold ${currentRank.color} flex items-center gap-1`}>
                  {currentRank.emoji} {currentRank.label}
                </span>
                {avgRating !== null && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {avgRating.toFixed(1)}
                    <span className="text-muted-foreground font-normal">({profile.reviewCount} reviews)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reputation */}
          <div className="space-y-4">
            {repBadges.length > 0 && <ReputationBadges badges={repBadges} />}
            <TrustMeter value={trustFactor} />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl font-black text-primary">{points}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Points</div>
              </div>
              <div className="p-2.5 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl font-black text-secondary">{profile.sessionsAsHirerCount ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Hired</div>
              </div>
              <div className="p-2.5 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl font-black text-green-400">{profile.sessionsAsGamerCount ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Played</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vote panel */}
      {user && <VotePanel profileId={profileId} />}

      {/* Bio */}
      {profile.bio && (
        <Card className="border-border bg-card/40">
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">About</div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {profile.reviews.length > 0 && (
        <Card className="border-border bg-card/40">
          <CardContent className="pt-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" /> Reviews ({profile.reviewCount})
            </div>
            <div className="space-y-2.5">
              {profile.reviews.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-background/50 border border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{r.reviewerName ?? "Anonymous"}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-2.5 w-2.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`}
                        />
                      ))}
                      <span className="text-xs font-black text-yellow-400 ml-1">{r.rating}/10</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground/80 leading-relaxed">{r.comment}</p>}
                  <div className="text-[10px] text-muted-foreground/50">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      {((profile.sessionsAsGamer?.length ?? 0) > 0 || (profile.sessionsAsHirer?.length ?? 0) > 0) && (
        <Card className="border-border bg-card/40">
          <CardContent className="pt-5 space-y-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5" /> Session History
            </div>
            {(profile.sessionsAsGamer?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Played As Gamer</div>
                {profile.sessionsAsGamer?.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Gamepad2 className="h-3 w-3 text-primary/60 shrink-0" />
                    <span className="text-white font-medium">{s.gameName ?? "Unknown"}</span>
                    {s.platform && <span className="text-muted-foreground/60">{s.platform}</span>}
                    {s.createdAt && <span className="ml-auto text-muted-foreground/50">{format(new Date(s.createdAt), "MMM d")}</span>}
                  </div>
                ))}
              </div>
            )}
            {(profile.sessionsAsHirer?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-secondary font-bold uppercase tracking-widest">Hired As Host</div>
                {profile.sessionsAsHirer?.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Target className="h-3 w-3 text-secondary/60 shrink-0" />
                    <span className="text-white font-medium">{s.gameName}</span>
                    {s.platform && <span className="text-muted-foreground/60">{s.platform}</span>}
                    <span className="ml-auto text-muted-foreground/50">{format(new Date(s.createdAt), "MMM d")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gaming quest */}
      {(profile.questEntries?.length ?? 0) > 0 && (
        <Card className="border-border bg-card/40">
          <CardContent className="pt-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Gaming Quest
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {profile.questEntries?.map((q) => (
                <div key={q.id} className="p-3 rounded-xl bg-background/50 border border-border/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="text-sm font-bold text-white">{q.gameName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{q.helpType}</div>
                  <div className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider">{q.playstyle}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
