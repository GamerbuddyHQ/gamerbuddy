import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useUserProfile, useUpdateProfile, useShopItems, usePurchaseItem,
  useMyQuestEntries, useAddQuestEntry, useDeleteQuestEntry, useVerifyId,
  type ShopItem, type QuestEntry,
} from "@/lib/bids-api";
import { VerifiedBadge } from "@/components/verified-badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert,
  Star, Trophy, Swords, Edit3, Check, X, Palette, Tag,
  Sparkles, Lock, CheckCircle2, Plus, Trash2, Gamepad2,
  Zap, Target, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── GAMER RULES CARD ───────────────────────────────────────── */
const GAMER_RULES = [
  {
    n: 1,
    title: "Be Friendly and Positive at All Times",
    body: "Use respectful, encouraging, and positive language. No toxicity, rage, sarcasm, or negative comments.",
    icon: "😊",
  },
  {
    n: 2,
    title: "Respect the Hirer's Objectives",
    body: "Always follow the exact objectives and instructions in the request. Do not skip or change them without the hirer's permission.",
    icon: "🎯",
  },
  {
    n: 3,
    title: "Never Ask for Account Passwords",
    body: "Never ask the hirer to share their Steam, Epic, PlayStation, Xbox, Nintendo, or any account password. This is strictly forbidden and will result in instant ban.",
    icon: "🔒",
    highlight: true,
  },
  {
    n: 4,
    title: "Maintain Professional Behavior",
    body: "No rude backseat gaming, no sharing personal information, no advertising other services, and no trying to move the session or payment off-platform.",
    icon: "🤝",
  },
  {
    n: 5,
    title: "Complete the Session Honestly",
    body: "Play for the agreed time and try your best to meet the objectives. Communicate honestly if you cannot deliver.",
    icon: "✅",
  },
  {
    n: 6,
    title: "Respect the Hirer's Comfort",
    body: "Make the hirer feel safe and comfortable. Adjust your playstyle if they ask for a more chill or slower pace.",
    icon: "🛡️",
  },
  {
    n: 7,
    title: "Ask About Voice Chat",
    body: "Always ask the hirer first if they want you to join Discord or use in-game VoIP. Do not assume or force voice chat. Respect their preference.",
    icon: "🎙️",
  },
];

function GamerRulesCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-amber-500/25 bg-card/40 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-500/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Gamer Code of Conduct</div>
            <div className="text-xs text-muted-foreground mt-0.5">Rules for gamers who want to get hired</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 hidden sm:block">
            {open ? "Collapse" : "Read Rules"}
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground leading-relaxed pt-4">
            If you want to get hired on Gamerbuddy, you must strictly follow these rules. They keep the platform safe, friendly, and professional for everyone.
          </p>

          <div className="space-y-3">
            {GAMER_RULES.map((rule) => (
              <div
                key={rule.n}
                className={`flex gap-3 p-3 rounded-xl ${rule.highlight
                  ? "bg-red-500/8 border border-red-500/20"
                  : "bg-background/40 border border-border/40"}`}
              >
                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${rule.highlight
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-primary/15 text-primary border border-primary/25"}`}
                  >
                    {rule.n}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[13px]">{rule.icon}</span>
                    <span className={`text-xs font-bold ${rule.highlight ? "text-red-300" : "text-white"}`}>
                      {rule.title}
                    </span>
                    {rule.highlight && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded">
                        Instant Ban
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Warning footer */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-red-500/6 border border-red-500/25">
            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-red-300 mb-0.5">Important Warning</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Breaking any of these rules will result in{" "}
                <span className="text-red-300 font-semibold">immediate account suspension</span>{" "}
                and loss of Trust Factor and earnings. We take this seriously to protect all users.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

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

const POPULAR_GAMES = [
  "Apex Legends", "Valorant", "Fortnite", "Call of Duty", "League of Legends",
  "Dota 2", "CS2", "Minecraft", "Overwatch 2", "Rocket League", "FIFA",
  "Rainbow Six Siege", "PUBG", "Elden Ring", "World of Warcraft",
];

const HELP_TYPE_SUGGESTIONS = [
  "Expert carry", "Rank boosting", "Teaching beginners", "Chill co-op partner",
  "PvP coaching", "Raid & dungeon runs", "Storyline completion", "Speed running",
  "Achievement hunting", "Pro duo queue",
];

const PLAYSTYLE_OPTIONS = [
  "Competitive", "Chill & laid-back", "Supportive", "Strategic", "Patient",
  "Aggressive", "Team-oriented", "Friendly", "Solo-carry", "Communicative",
];

const GAME_COLORS = [
  "border-primary/40 bg-primary/5",
  "border-secondary/40 bg-secondary/5",
  "border-green-500/40 bg-green-500/5",
  "border-amber-500/40 bg-amber-500/5",
  "border-pink-500/40 bg-pink-500/5",
  "border-indigo-500/40 bg-indigo-500/5",
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
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 shadow-sm`} style={{ width: `${pct}%` }} />
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

function QuestEntryCard({ entry, onDelete, colorClass }: { entry: QuestEntry; onDelete: () => void; colorClass: string }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
            <Gamepad2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white text-sm truncate">{entry.gameName}</div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-semibold">Game</div>
          </div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors p-1 rounded">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-red-400 font-semibold">Remove?</span>
            <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors p-1"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-white transition-colors p-1"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">What I Offer</div>
            <div className="text-xs font-semibold text-white">{entry.helpType}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">Playstyle</div>
            <div className="text-xs font-semibold text-white">{entry.playstyle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddQuestForm({ onCancel }: { onCancel: () => void }) {
  const [gameName, setGameName] = useState("");
  const [helpType, setHelpType] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [showGameSuggestions, setShowGameSuggestions] = useState(false);
  const addEntry = useAddQuestEntry();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !helpType.trim() || !playstyle.trim()) return;
    addEntry.mutate(
      { gameName: gameName.trim(), helpType: helpType.trim(), playstyle: playstyle.trim() },
      {
        onSuccess: () => {
          toast({ title: "Game added to your Quest!" });
          onCancel();
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.06) inset" }}>
      <div className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
        <Plus className="h-3.5 w-3.5" /> Add Game to Quest
      </div>

      {/* Game Name */}
      <div className="space-y-1.5 relative">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Game Name *</Label>
        <Input
          value={gameName}
          onChange={(e) => { setGameName(e.target.value); setShowGameSuggestions(e.target.value.length > 0); }}
          onFocus={() => setShowGameSuggestions(true)}
          onBlur={() => setTimeout(() => setShowGameSuggestions(false), 200)}
          placeholder="e.g. Apex Legends"
          className="bg-background/60 text-sm"
          maxLength={60}
          required
        />
        {showGameSuggestions && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-card shadow-xl max-h-44 overflow-y-auto">
            {POPULAR_GAMES.filter((g) => g.toLowerCase().includes(gameName.toLowerCase()) && g.toLowerCase() !== gameName.toLowerCase()).slice(0, 8).map((g) => (
              <button key={g} type="button" onMouseDown={() => { setGameName(g); setShowGameSuggestions(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors text-foreground/80">
                {g}
              </button>
            ))}
            {POPULAR_GAMES.filter((g) => g.toLowerCase().includes(gameName.toLowerCase()) && g.toLowerCase() !== gameName.toLowerCase()).length === 0 && gameName && (
              <div className="px-3 py-2 text-sm text-muted-foreground italic">Press enter to use "{gameName}"</div>
            )}
          </div>
        )}
        {/* Popular chips */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {POPULAR_GAMES.slice(0, 6).map((g) => (
            <button key={g} type="button" onClick={() => setGameName(g)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${gameName === g ? "bg-primary/20 border-primary/50 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-white"}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Help Type */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What Can You Help With? *</Label>
        <Input
          value={helpType}
          onChange={(e) => setHelpType(e.target.value)}
          placeholder='e.g. "Expert carry for raids"'
          className="bg-background/60 text-sm"
          maxLength={100}
          required
        />
        <div className="flex flex-wrap gap-1.5">
          {HELP_TYPE_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setHelpType(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${helpType === s ? "bg-secondary/20 border-secondary/50 text-secondary" : "border-border/50 text-muted-foreground hover:border-secondary/30 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Playstyle */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Playstyle *</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLAYSTYLE_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setPlaystyle(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-all ${playstyle === s ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-border/50 text-muted-foreground hover:border-amber-500/30 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
        {playstyle && (
          <div className="text-xs text-muted-foreground">Selected: <span className="text-amber-400 font-semibold">{playstyle}</span></div>
        )}
      </div>

      <div className="flex gap-2.5 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs font-bold uppercase">
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!gameName.trim() || !helpType.trim() || !playstyle.trim() || addEntry.isPending}
          className="bg-primary hover:bg-primary/90 text-xs font-bold uppercase flex-1 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          {addEntry.isPending ? (
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Adding…</span>
          ) : (
            <><Plus className="h-3.5 w-3.5 mr-1" /> Add Game</>
          )}
        </Button>
      </div>
    </form>
  );
}

function QuestSection() {
  const { data: entries = [], isLoading } = useMyQuestEntries();
  const deleteEntry = useDeleteQuestEntry();
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteEntry.mutate(id, {
      onSuccess: () => toast({ title: "Game removed from Quest" }),
      onError: (err: any) => toast({ title: "Failed", description: err?.error, variant: "destructive" }),
    });
  };

  return (
    <Card className="border-border bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            My Quest
            <span className="text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">
              — games you offer to play for hire
            </span>
          </CardTitle>
          {!adding && entries.length < 10 && (
            <Button size="sm" onClick={() => setAdding(true)}
              className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase h-7 px-3">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Game
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
          List the games you're available to play and what kind of help you can provide. This shows on your public profile and on your bids.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && <AddQuestForm onCancel={() => setAdding(false)} />}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : entries.length === 0 && !adding ? (
          <div className="text-center py-10 border-2 border-dashed border-border/40 rounded-xl bg-background/20">
            <Gamepad2 className="h-9 w-9 mx-auto mb-3 text-muted-foreground/25" />
            <div className="text-sm font-bold text-muted-foreground/60">No games in your Quest yet</div>
            <div className="text-xs text-muted-foreground/40 mt-1">Add the games you play to start getting hired.</div>
            <Button size="sm" onClick={() => setAdding(true)} className="mt-4 bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map((entry, idx) => (
              <QuestEntryCard
                key={entry.id}
                entry={entry}
                colorClass={GAME_COLORS[idx % GAME_COLORS.length]}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}

        {entries.length >= 10 && (
          <p className="text-xs text-muted-foreground/50 text-center">Maximum 10 games reached.</p>
        )}
      </CardContent>
    </Card>
  );
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
        toast({ title: `${item.label} unlocked!`, description: `Spent ${item.cost} pts · ${data.newPoints} pts remaining` });
      },
      onError: (err: any) => toast({ title: "Purchase failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  const handleEquip = (item: ShopItem) => {
    const field = item.type === "background" ? "profileBackground" : "profileTitle";
    const alreadyEquipped = equipped[item.type] === item.id;
    updateProfile.mutate(
      { [field]: alreadyEquipped ? null : item.id },
      {
        onSuccess: () => toast({ title: alreadyEquipped ? "Unequipped" : `${item.label} equipped!` }),
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
                tab === t ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-border/80"
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
                      {equippedNow ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Equipped</> : "Equip"}
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
                      {canAfford ? <><Trophy className="h-3.5 w-3.5 mr-1" /> Buy · {item.cost} pts</> : <><Lock className="h-3.5 w-3.5 mr-1" /> {item.cost} pts</>}
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

function VerificationSection({ idVerified }: { idVerified: boolean }) {
  const verifyId = useVerifyId();
  const { toast } = useToast();

  const handleVerify = () => {
    verifyId.mutate(null, {
      onSuccess: () => toast({ title: "Identity Verified!", description: "Your Verified badge is now active on your profile." }),
      onError: (err: any) => toast({ title: "Verification Failed", description: err?.error || "Please try again.", variant: "destructive" }),
    });
  };

  if (idVerified) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5"
        style={{ boxShadow: "0 0 20px rgba(52,211,153,0.08)" }}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 0 16px rgba(52,211,153,0.25)" }}>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-sm font-extrabold text-white uppercase tracking-wide">Identity Verified</span>
                <VerifiedBadge idVerified={true} variant="compact" />
              </div>
              <p className="text-xs text-emerald-300/70 leading-relaxed">
                Your Verified badge is now active on your profile, bids, and request listings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white mb-0.5">Verify Your Identity</div>
              <p className="text-xs text-muted-foreground/70">
                Earn the <span className="text-emerald-400 font-semibold">Verified</span> badge — trusted by more hirers, more bids accepted.
              </p>
            </div>
          </div>
          <Button
            onClick={handleVerify}
            disabled={verifyId.isPending}
            size="sm"
            className="shrink-0 font-bold text-xs uppercase tracking-wide"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              border: "none",
              boxShadow: "0 0 14px rgba(16,185,129,0.35)",
            }}
          >
            {verifyId.isPending ? (
              <><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5" />Verifying…</>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Verify ID</>
            )}
          </Button>
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
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
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

        <div className="bg-card/80 backdrop-blur-sm px-4 sm:px-6 pb-5 -mt-px relative">
          {/* Avatar row — floats up over the banner */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 -translate-y-8 sm:-translate-y-10 mb-0">
            <div
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-card flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${bgAccent.replace("0.6", "0.3")}, rgba(0,0,0,0.8))`, boxShadow: `0 0 24px ${bgAccent}` }}
            >
              <span className="text-3xl sm:text-4xl font-black text-white uppercase">{user.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0 sm:pb-1 sm:translate-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight leading-none">{user.name}</h1>
                {titleLabel && (
                  <span className="text-xs font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {titleLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <VerifiedBadge idVerified={user.idVerified} variant="full" />
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

          <div className="-mt-4 sm:-mt-6 space-y-4">
            <TrustMeter value={trustFactor} />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl sm:text-2xl font-black text-primary">{points}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Points</div>
                {nextRank && <div className="text-[9px] text-muted-foreground/60 hidden sm:block">{nextRank.min - points} to {nextRank.label}</div>}
              </div>
              <div className="p-2.5 sm:p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl sm:text-2xl font-black text-secondary">{profile?.sessionsAsHirer?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Hired</div>
              </div>
              <div className="p-2.5 sm:p-3 bg-background/50 rounded-xl border border-border text-center space-y-1">
                <div className="text-xl sm:text-2xl font-black text-green-400">{profile?.sessionsAsGamer?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Played</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VERIFICATION CARD */}
      <VerificationSection idVerified={user.idVerified} />

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

      {/* MY QUEST */}
      <QuestSection />

      {/* GAMER CODE OF CONDUCT */}
      <GamerRulesCard />

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
                  {earned ? <span className="text-[9px] text-muted-foreground">Earned</span> : <span className="text-[9px] text-muted-foreground">{badge.min} pts</span>}
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
