import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useUserProfile, useUpdateProfile, useShopItems, usePurchaseItem,
  type ShopItem,
} from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert,
  Star, Trophy, Swords, Edit3, Check, X, Palette, Tag,
  Sparkles, Lock, CheckCircle2,
} from "lucide-react";

const BG_STYLES: Record<string, string> = {
  "bg-neon-purple":  "from-purple-900 via-violet-800 to-purple-950",
  "bg-cyber-blue":   "from-cyan-900 via-blue-800 to-cyan-950",
  "bg-fire-red":     "from-red-900 via-orange-800 to-red-950",
  "bg-matrix-green": "from-green-950 via-emerald-900 to-green-950",
  "bg-gold-rush":    "from-yellow-900 via-amber-800 to-yellow-950",
  "bg-arctic":       "from-sky-900 via-blue-800 to-indigo-950",
  "bg-void":         "from-neutral-950 via-zinc-900 to-black",
};

const BG_ACCENT: Record<string, string> = {
  "bg-neon-purple":  "rgba(168,85,247,0.6)",
  "bg-cyber-blue":   "rgba(6,182,212,0.6)",
  "bg-fire-red":     "rgba(239,68,68,0.6)",
  "bg-matrix-green": "rgba(34,197,94,0.6)",
  "bg-gold-rush":    "rgba(234,179,8,0.6)",
  "bg-arctic":       "rgba(56,189,248,0.6)",
  "bg-void":         "rgba(255,255,255,0.15)",
};

const RANK_BADGES = [
  { min: 0,    label: "Recruit",  emoji: "🪖", color: "text-muted-foreground border-border bg-background/60" },
  { min: 100,  label: "Veteran",  emoji: "⚔️", color: "text-green-400 border-green-500/40 bg-green-500/10" },
  { min: 500,  label: "Elite",    emoji: "💎", color: "text-primary border-primary/40 bg-primary/10" },
  { min: 1000, label: "Legend",   emoji: "🌟", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  { min: 5000, label: "Champion", emoji: "👑", color: "text-secondary border-secondary/40 bg-secondary/10" },
];

function TrustMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 1000) * 100));
  const color =
    pct >= 70 ? "from-green-500 to-emerald-400" :
    pct >= 40 ? "from-yellow-500 to-amber-400" :
    "from-red-500 to-rose-400";
  const label =
    pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Neutral" : pct >= 20 ? "Poor" : "Risky";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Trust Factor
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="font-black text-white text-sm">{value}<span className="text-muted-foreground font-normal text-xs">/1000</span></span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-background border border-border/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 shadow-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>Risky</span><span>Neutral</span><span>Excellent</span>
      </div>
    </div>
  );
}

function ScoreBadge({ rating }: { rating: number }) {
  const color =
    rating >= 9 ? "bg-emerald-400 text-black" :
    rating >= 7 ? "bg-green-500 text-black" :
    rating >= 5 ? "bg-yellow-400 text-black" :
    rating >= 3 ? "bg-orange-500 text-white" :
    "bg-red-500 text-white";
  return <span className={`text-xs font-black px-2 py-0.5 rounded ${color}`}>{rating}/10</span>;
}

function ShopSection({
  profile,
  currentUserId,
}: {
  profile: ReturnType<typeof useUserProfile>["data"];
  currentUserId: number;
}) {
  const { data: shopItems = [] } = useShopItems();
  const purchase = usePurchaseItem();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [tab, setTab] = useState<"background" | "title">("background");

  const purchased = new Set(profile?.purchasedItems ?? []);
  const equipped = {
    background: profile?.profileBackground ?? null,
    title: profile?.profileTitle ?? null,
  };

  const backgrounds = shopItems.filter((i) => i.type === "background");
  const titles = shopItems.filter((i) => i.type === "title");
  const points = profile?.points ?? 0;

  const handlePurchase = (item: ShopItem) => {
    purchase.mutate(item.id, {
      onSuccess: (data) => {
        toast({
          title: `${item.label} unlocked!`,
          description: `Spent ${item.cost} pts · ${data.newPoints} pts remaining`,
        });
      },
      onError: (err: any) => toast({
        title: "Purchase failed",
        description: err?.error || "Error",
        variant: "destructive",
      }),
    });
  };

  const handleEquip = (item: ShopItem) => {
    const field = item.type === "background" ? "profileBackground" : "profileTitle";
    const alreadyEquipped = equipped[item.type] === item.id;
    updateProfile.mutate(
      { [field]: alreadyEquipped ? null : item.id },
      {
        onSuccess: () => toast({
          title: alreadyEquipped ? "Unequipped" : `${item.label} equipped!`,
        }),
        onError: (err: any) => toast({ title: "Error", description: err?.error, variant: "destructive" }),
      }
    );
  };

  const items = tab === "background" ? backgrounds : titles;

  return (
    <Card className="border-border bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Points Shop
          </CardTitle>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-black text-primary">{points}</span>
            <span className="text-xs text-muted-foreground">pts available</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {(["background", "title"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                tab === t
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {t === "background" ? <Palette className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
              {t === "background" ? "Backgrounds" : "Titles"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const owned = purchased.has(item.id);
            const equippedNow = equipped[item.type] === item.id;
            const canAfford = points >= item.cost;
            const bgGrad = item.type === "background" ? BG_STYLES[item.id] : null;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 space-y-2 transition-all ${
                  equippedNow
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "border-border bg-background/40 hover:border-border/80"
                }`}
              >
                {bgGrad && (
                  <div className={`h-12 rounded-lg bg-gradient-to-r ${bgGrad} border border-white/10`} />
                )}
                {item.type === "title" && (
                  <div className="h-12 rounded-lg border border-border bg-background/60 flex items-center justify-center">
                    <span className="text-sm font-black text-white uppercase tracking-widest">{item.label}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-yellow-400">
                    <Trophy className="h-3.5 w-3.5" />
                    {item.cost}
                  </div>
                </div>
                <div className="flex gap-2">
                  {owned ? (
                    <Button
                      size="sm"
                      className={`flex-1 text-xs font-bold uppercase ${
                        equippedNow
                          ? "bg-primary text-white hover:bg-primary/80"
                          : "bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                      onClick={() => handleEquip(item)}
                      disabled={updateProfile.isPending}
                    >
                      {equippedNow ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Equipped</>
                      ) : (
                        "Equip"
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`flex-1 text-xs font-bold uppercase ${
                        canAfford
                          ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                          : "bg-background border border-border text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => canAfford && handlePurchase(item)}
                      disabled={!canAfford || purchase.isPending}
                    >
                      {canAfford ? (
                        <><Trophy className="h-3.5 w-3.5 mr-1" /> Buy · {item.cost} pts</>
                      ) : (
                        <><Lock className="h-3.5 w-3.5 mr-1" /> {item.cost} pts</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useUserProfile(user?.id ?? null);
  const updateProfile = useUpdateProfile();

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");

  if (!user) return null;
  if (isLoading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  const points = profile?.points ?? user.points ?? 0;
  const trustFactor = profile?.trustFactor ?? 100;
  const bgId = profile?.profileBackground;
  const titleId = profile?.profileTitle;
  const bgGrad = bgId ? (BG_STYLES[bgId] ?? "from-primary/20 to-secondary/10") : "from-primary/15 via-secondary/10 to-background";
  const bgAccent = bgId ? (BG_ACCENT[bgId] ?? "rgba(168,85,247,0.4)") : "rgba(168,85,247,0.4)";

  const currentRank = RANK_BADGES.filter((b) => points >= b.min).pop() ?? RANK_BADGES[0];
  const nextRank = RANK_BADGES.find((b) => points < b.min);

  const titleLabel = titleId
    ? (profile?.purchasedItems?.includes(titleId) ? titleId.replace("title-", "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : null)
    : null;

  const handleSaveBio = () => {
    updateProfile.mutate({ bio: draftBio }, {
      onSuccess: () => {
        toast({ title: "Bio updated!" });
        setEditingBio(false);
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* BANNER + AVATAR */}
      <div className="rounded-2xl overflow-hidden border border-border/60 relative">
        <div
          className={`h-44 bg-gradient-to-br ${bgGrad} relative`}
          style={{ boxShadow: `inset 0 0 80px ${bgAccent}` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.04),transparent_70%)]" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 70px)" }} />

          {bgId && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {bgId.replace("bg-", "").replace("-", " ")}
              </span>
            </div>
          )}
        </div>

        <div className="bg-card/80 backdrop-blur-sm px-6 pb-5 -mt-px relative">
          <div className="flex items-end gap-5 -translate-y-10 mb-0">
            <div
              className="h-24 w-24 rounded-full border-4 border-card flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${bgAccent.replace("0.6", "0.3")}, rgba(0,0,0,0.8))`, boxShadow: `0 0 24px ${bgAccent}` }}
            >
              <span className="text-4xl font-black text-white uppercase">{user.name.charAt(0)}</span>
            </div>

            <div className="flex-1 min-w-0 pb-1 translate-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-white uppercase tracking-tight leading-none">{user.name}</h1>
                {titleLabel && (
                  <span className="text-xs font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {titleLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {user.idVerified ? (
                  <span className="flex items-center text-[11px] font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center text-[11px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/30">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Unverified
                  </span>
                )}
                <span className={`flex items-center text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentRank.color}`}>
                  {currentRank.emoji} {currentRank.label}
                </span>
                {profile?.avgRating != null && (
                  <span className="flex items-center text-[11px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/30">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                    {profile.avgRating.toFixed(1)}/10 ({profile.reviewCount})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="-mt-6 space-y-4">
            <TrustMeter value={trustFactor} />

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-2xl font-black text-primary">{points}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Points</div>
                {nextRank && (
                  <div className="text-[9px] text-muted-foreground/60">{nextRank.min - points} to {nextRank.label}</div>
                )}
              </div>
              <div className="p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-2xl font-black text-secondary">{profile?.sessionsAsHirer?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Hired</div>
              </div>
              <div className="p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-2xl font-black text-green-400">{profile?.sessionsAsGamer?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Played</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BIO */}
      <Card className="border-border bg-card/40">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> About Me
            </div>
            {!editingBio && (
              <button
                onClick={() => { setDraftBio(profile?.bio ?? ""); setEditingBio(true); }}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>
          {editingBio ? (
            <div className="space-y-2">
              <Textarea
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                placeholder="Tell others about yourself — your playstyle, favourite games, availability…"
                className="resize-none h-24 bg-background text-sm"
                maxLength={300}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draftBio.length}/300</span>
                <div className="flex gap-2">
                  <Button size="sm"
                    className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white font-bold text-xs uppercase"
                    onClick={handleSaveBio} disabled={updateProfile.isPending}>
                    <Check className="h-3.5 w-3.5 mr-1" />{updateProfile.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs font-bold uppercase" onClick={() => setEditingBio(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/70 leading-relaxed min-h-[2.5rem]">
              {profile?.bio
                ? profile.bio
                : <span className="text-muted-foreground/40 italic">No bio yet — click Edit to write something about yourself.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* BADGE SHOWCASE */}
      <Card className="border-border bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> Badge Showcase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {RANK_BADGES.map((badge) => {
              const earned = points >= badge.min;
              return (
                <div
                  key={badge.label}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    earned ? badge.color : "border-border/30 bg-background/30 text-muted-foreground/30 grayscale"
                  }`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{badge.label}</span>
                  {earned ? (
                    <span className="text-[9px] text-muted-foreground">Earned</span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">{badge.min} pts</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SESSION HISTORY */}
      {((profile?.sessionsAsHirer?.length ?? 0) + (profile?.sessionsAsGamer?.length ?? 0)) > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" /> Session History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {profile?.sessionsAsHirer?.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-secondary border border-secondary/30 bg-secondary/10 px-2 py-0.5 rounded font-bold shrink-0">Hired</span>
                  <span className="text-sm font-semibold text-white truncate">{s.gameName}</span>
                  {s.platform && <span className="text-xs text-muted-foreground hidden sm:block">{s.platform}</span>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
              </div>
            ))}
            {profile?.sessionsAsGamer?.map((s) => (
              <div key={s.requestId} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded font-bold shrink-0">Played</span>
                  <span className="text-sm font-semibold text-white truncate">{s.gameName ?? "—"}</span>
                  {s.platform && <span className="text-xs text-muted-foreground hidden sm:block">{s.platform}</span>}
                </div>
                {s.createdAt && <span className="text-xs text-muted-foreground shrink-0">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* REVIEWS */}
      {(profile?.reviews?.length ?? 0) > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" /> Reviews Received
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {profile?.reviews?.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-white">{r.reviewerName}</span>
                  </div>
                  <ScoreBadge rating={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-foreground/75 leading-relaxed pl-9 border-l-2 border-border/40">{r.comment}</p>}
                <div className="text-xs text-muted-foreground pl-9">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ACCOUNT INFO */}
      <Card className="border-border bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-background/50 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </div>
            <div className="font-mono text-sm truncate">{user.email}</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </div>
            <div className="font-mono text-sm">{user.phone}</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border md:col-span-2 space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Member Since
            </div>
            <div className="font-mono text-sm">{format(new Date(user.createdAt), "MMMM do, yyyy")}</div>
          </div>
        </CardContent>
      </Card>

      {/* POINTS SHOP */}
      {profile && <ShopSection profile={profile} currentUserId={user.id} />}
    </div>
  );
}
