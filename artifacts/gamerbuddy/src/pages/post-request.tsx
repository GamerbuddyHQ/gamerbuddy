import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CountryCombobox, GenderSelect } from "@/components/country-combobox";
import {
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
  CreateRequestBodyPlatform,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Gamepad2,
  Zap,
  Target,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Globe,
  UserRound,
  Clock,
  IndianRupee,
  DollarSign,
  MapPin,
  Info,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { usePostRequest } from "@/lib/bids-api";

const OBJECTIVES_MAX = 500;

const UNREALISTIC_PATTERNS = [
  /world[\s-]?first/i,
  /#\s*1\s*(global|rank|player|world|server|leaderboard)/i,
  /rank\s*[#]?\s*1\s*(global|world|server|overall)/i,
  /\bin\s+[12]\s*(hour|hr)s?\b/i,
  /\bin\s+one\s+(hour|day)\b/i,
  /\bin\s+1\s+(hour|hr|day)\b/i,
  /\bundefeated\b/i,
  /(immortal|radiant|challenger|grandmaster|predator|global[\s-]elite)\s+in\s+\d+\s*(day|hour)/i,
  /(entire|whole|full)\s+game\s+in\s+\d+\s*(hour|day)/i,
  /\bnever\s+die\b/i,
  /\bperfect\s+game\b.*\bin\s+\d+/i,
  /100%\s+in\s+\d+\s*(hour|day)/i,
  /\baimbot\b/i,
];

function checkUnrealistic(text: string): boolean {
  return UNREALISTIC_PATTERNS.some((p) => p.test(text));
}

const CHALLENGING_PATTERNS = [
  /\b(defeat|beat|kill|destroy)\b/i,
  /\bcarry\b/i,
  /\bboost\b/i,
  /\b(rank\s*up|rank\s*grind|climb\s+rank|ranked)\b/i,
  /\b(hard|difficult|challenging|tough)\b/i,
  /\b(boss\s*fight|boss\s*kill|raid|dungeon|endgame|end\s*game)\b/i,
  /\b(finish|complete)\s+the\s+(game|campaign|story|main|chapter)\b/i,
  /\b(malenia|margit|radahn|maliketh|godfrey|godskin|rykard|morgott|maleniaEldenRing)\b/i,
  /\b(platinum|diamond|ascendant|immortal|challenger|master|grandmaster|predator|radiant|global\s*elite)\b/i,
  /\b(pvp|competitive|ranked\s*match|ranked\s*game)\b/i,
  /\b(speedrun|100%|all\s*boss|all\s*achievement)\b/i,
  /\b(no\s*death|deathless|hardcore)\b/i,
];

function checkChallenging(text: string): boolean {
  return CHALLENGING_PATTERNS.some((p) => p.test(text));
}

const requestSchema = z.object({
  objectives: z
    .string()
    .min(10, "Tell us what you need help with (min 10 characters)"),
  gameName: z.string().optional(),
  platform: z.string().optional(),
  playStyle: z.string().optional(),
  additionalGoals: z.string().optional(),
  expectedDuration: z.string().optional(),
});

type FormValues = z.infer<typeof requestSchema>;

const PLATFORM_OPTIONS = [
  { value: "any", label: "Any Platform", icon: "🎮" },
  { value: CreateRequestBodyPlatform.PC, label: "PC", icon: "🖥️" },
  { value: CreateRequestBodyPlatform.PlayStation, label: "PlayStation", icon: "🎮" },
  { value: CreateRequestBodyPlatform.Xbox, label: "Xbox", icon: "🟩" },
  { value: "Nintendo Switch", label: "Nintendo Switch", icon: "🕹️" },
  { value: "Steam Deck", label: "Steam Deck", icon: "🎲" },
  { value: "Mobile", label: "Mobile", icon: "📱" },
] as const;

const PLAY_STYLE_OPTIONS = [
  { value: "any", label: "Any Style", emoji: "🎮", desc: "No preference — all welcome", color: "border-border/50 bg-background/40" },
  { value: "casual", label: "Casual", emoji: "😎", desc: "Relaxed, no pressure fun", color: "border-green-500/30 bg-green-500/5 text-green-300" },
  { value: "competitive", label: "Competitive", emoji: "🏆", desc: "Win-focused, ranked grind", color: "border-amber-500/30 bg-amber-500/5 text-amber-300" },
  { value: "teaching", label: "Teaching", emoji: "📚", desc: "Learn tips & strategies", color: "border-blue-500/30 bg-blue-500/5 text-blue-300" },
  { value: "chill", label: "Chill", emoji: "🌊", desc: "Good vibes, good company", color: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300" },
  { value: "story", label: "Story Mode", emoji: "📖", desc: "Campaign & narrative games", color: "border-purple-500/30 bg-purple-500/5 text-purple-300" },
] as const;

const EXAMPLE_PROMPTS = [
  "Help me finish the main story of Elden Ring",
  "Carry me to Ascendant rank in Valorant",
  "Play 5 ranked games with me in League of Legends",
  "Teach me how to speedrun this level",
  "Co-op partner for Baldur's Gate 3 — new playthrough",
  "Boost my KD ratio in Warzone — play 3 matches",
];

const POPULAR_GAMES = [
  "Elden Ring", "Valorant", "League of Legends", "Apex Legends", "Fortnite",
  "Cyberpunk 2077", "Call of Duty: Warzone", "Baldur's Gate 3", "Minecraft",
  "World of Warcraft", "Counter-Strike 2", "Destiny 2", "GTA V", "FIFA 25",
  "Diablo IV", "Overwatch 2", "PUBG", "Rocket League", "Dota 2", "Rainbow Six Siege",
  "Dead by Daylight", "Helldivers 2", "Palworld", "Stardew Valley", "It Takes Two",
  "Dark Souls III", "Sekiro", "God of War", "Spider-Man 2", "Hogwarts Legacy",
];

const MIN_RATES = {
  india: { perHour: 200, currency: "INR", symbol: "₹" },
  international: { perHour: 5, currency: "USD", symbol: "$" },
} as const;

export default function PostRequest() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const postRequest = usePostRequest();
  const [preferredCountry, setPreferredCountry] = useState("any");
  const [preferredGender, setPreferredGender] = useState("any");
  const [expiryOption, setExpiryOption] = useState<"forever" | "24h" | "48h" | "7d">("forever");
  const [hirerRegion, setHirerRegion] = useState<"india" | "international">("international");

  const minRate = MIN_RATES[hirerRegion];

  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      objectives: "",
      gameName: "",
      platform: "any",
      playStyle: "any",
      additionalGoals: "",
      expectedDuration: "",
    },
  });

  const objectivesValue = form.watch("objectives") ?? "";
  const selectedPlatform = form.watch("platform");
  const selectedPlayStyle = form.watch("playStyle");
  const gameNameValue = form.watch("gameName") ?? "";

  const [unrealisticWarning, setUnrealisticWarning] = useState(false);
  const [challengingHint, setChallengingHint] = useState(false);
  useEffect(() => {
    const isUnrealistic = objectivesValue.length >= 10 && checkUnrealistic(objectivesValue);
    const isChallenging = objectivesValue.length >= 10 && checkChallenging(objectivesValue);
    setUnrealisticWarning(isUnrealistic);
    setChallengingHint(isChallenging && !isUnrealistic);
  }, [objectivesValue]);

  const canPost = wallets?.canPostRequest ?? false;
  const hiringBalance = wallets?.hiringBalance ?? 0;

  function onSubmit(values: FormValues) {
    if (!canPost) {
      toast({
        title: "Insufficient Funds",
        description: "You need at least $10.75 in your Hiring Wallet.",
        variant: "destructive",
      });
      return;
    }

    postRequest.mutate(
      {
        objectives: values.objectives,
        gameName: values.gameName?.trim() || "Not specified",
        platform: (values.platform && values.platform !== "any" ? values.platform : "Any") as any,
        skillLevel: "Any" as any,
        isBulkHiring: false,
        preferredCountry,
        preferredGender,
        expiryOption,
        hirerRegion,
        additionalGoals: values.additionalGoals || undefined,
        expectedDuration: values.expectedDuration || undefined,
        playStyle: values.playStyle && values.playStyle !== "any" ? values.playStyle : undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({
            title: "Quest Posted!",
            description: "Your quest is live — gamers will start bidding soon.",
          });
          setLocation("/my-requests");
        },
        onError: (error: any) => {
          const data = error?.data;
          const description =
            (data && typeof data === "object" ? data.error || data.message : null) ||
            error?.message ||
            "Failed to post request. Please try again.";
          toast({
            title: "Failed to post",
            description,
            variant: "destructive",
          });
        },
      }
    );
  }

  if (user && user.idVerified && !user.isActivated) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
          <Zap className="h-8 w-8 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-yellow-300">Activate Your Account First ⚡</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-md">
            You're verified! To post quests and hire gamers, complete the small one-time activation fee
            — <strong className="text-yellow-300">🇮🇳 ₹149 for India / 🌍 $5 Global</strong>.
            Paid once, never again. ❤️
          </p>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors"
        >
          Go to Dashboard to Activate
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          Post a Quest
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask for almost anything gaming-related. Be specific so gamers can bid accurately.
          Costs <span className="text-primary font-semibold">$10.75</span> from your Hiring Wallet.
        </p>
      </div>

      <SafetyBanner variant="compact" showSelfHire storageKey="gb_safety_post" />

      {/* Wallet status bar */}
      {!isLoadingWallets && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-4 py-3.5 ${
            canPost
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <div className="flex items-center gap-3">
            {canPost ? (
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <div>
              <div className={`text-sm font-bold ${canPost ? "text-green-400" : "text-destructive"}`}>
                {canPost ? "Hiring Wallet Ready" : "Insufficient Funds"}
              </div>
              <div className="text-xs text-muted-foreground">
                {canPost
                  ? `Balance: $${hiringBalance.toFixed(2)} — ready to post`
                  : `You have $${hiringBalance.toFixed(2)} — need $10.75 minimum`}
              </div>
            </div>
          </div>
          {!canPost && (
            <Button
              asChild
              size="sm"
              className="bg-primary text-white font-bold uppercase text-xs tracking-wider self-start sm:self-auto"
            >
              <Link href="/add-funds">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Add Funds
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Form card */}
      <Card className="border-border bg-card/50 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Quest Details
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">

              {/* ── GUIDELINE BANNER ── */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-3 w-full">
                    <p className="text-sm font-semibold text-blue-300">Tips for a great quest</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex items-start gap-1.5 text-green-400/90"><span className="shrink-0">✅</span><span>Help me finish this boss / story</span></div>
                      <div className="flex items-start gap-1.5 text-green-400/90"><span className="shrink-0">✅</span><span>Carry me to Platinum rank (5 games)</span></div>
                      <div className="flex items-start gap-1.5 text-green-400/90"><span className="shrink-0">✅</span><span>Teach me a specific mechanic or strategy</span></div>
                      <div className="flex items-start gap-1.5 text-green-400/90"><span className="shrink-0">✅</span><span>Play a few fun matches together</span></div>
                      <div className="flex items-start gap-1.5 text-red-400/70"><span className="shrink-0">❌</span><span>Carry me to #1 global rank in 1 day</span></div>
                      <div className="flex items-start gap-1.5 text-red-400/70"><span className="shrink-0">❌</span><span>Beat the entire game for me in 2 hours</span></div>
                    </div>
                    <div className="border-t border-blue-500/15 pt-2.5 space-y-2">
                      <p className="text-[11px] text-blue-200/70 leading-relaxed">
                        <span className="font-semibold text-blue-300">Difficult quests are totally welcome!</span> If you're stuck on a hard boss, need to climb a tough rank, or want to finish a long campaign — post it. Just be clear about the scope, and be open to fair bids so skilled gamers are motivated to help.
                      </p>
                      <p className="text-[11px] text-purple-300/80 leading-relaxed">
                        <span className="font-semibold">Better reward = better gamer.</span> The more competitive the reward, the more experienced, friendly, and serious gamers will bid on your quest. Don't just go for the lowest bid — it's worth paying a little more for someone reliable.
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                        Avoid impossible requests (e.g. "rank 1 globally in 1 day") — those rarely get bids and may be flagged.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PRIMARY: What do you need help with? ── */}
              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        What do you need help with? <span className="text-destructive">*</span>
                      </FormLabel>
                      <span
                        className={`text-xs tabular-nums ${
                          objectivesValue.length > OBJECTIVES_MAX
                            ? "text-destructive"
                            : objectivesValue.length > OBJECTIVES_MAX * 0.8
                            ? "text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {objectivesValue.length} / {OBJECTIVES_MAX}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 -mt-1">
                      If your request is difficult or time-consuming, say so — harder quests attract higher bids from skilled gamers.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder={`Be specific and realistic. Example: Help me defeat Malenia in Elden Ring, or Carry me to Platinum rank in Valorant (best of 5 games)`}
                        className="resize-none h-40 bg-background border-border focus-visible:border-primary transition-colors leading-relaxed"
                        disabled={!canPost}
                        maxLength={OBJECTIVES_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />

                    {/* Soft unrealistic warning */}
                    {unrealisticWarning && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-3 text-xs text-amber-300">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                        <p>
                          <span className="font-semibold">Heads up!</span> This request looks quite challenging — gamers are less likely to bid on very difficult or impossible quests. Are you sure it's realistic? Even a small tweak (like adding a time range or scope limit) can get you a lot more interest!
                        </p>
                      </div>
                    )}

                    {/* Positive challenging-quest hint */}
                    {challengingHint && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3 text-xs text-emerald-300 space-y-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                          <p>
                            <span className="font-semibold">This sounds like a challenging quest!</span> That's great — skilled gamers love a real challenge. For tough quests, be open to higher bids. The better the reward, the more experienced and reliable the gamer you'll get.
                          </p>
                        </div>
                        <div className="flex items-start gap-2 border-t border-emerald-500/15 pt-2">
                          <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400/70" />
                          <p className="text-emerald-300/70">
                            <span className="font-semibold text-emerald-300">Reward nudge:</span> This request seems challenging — consider accepting a mid-to-high bid rather than the lowest one. Experienced gamers are more likely to deliver great results on difficult quests.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Example prompt chips */}
                    {!objectivesValue && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {EXAMPLE_PROMPTS.slice(0, 4).map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            disabled={!canPost}
                            onClick={() => form.setValue("objectives", prompt)}
                            className="text-[11px] px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary/70 hover:bg-primary/15 hover:text-primary hover:border-primary/50 transition-all disabled:opacity-30"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* ── OPTIONAL: Game & Platform ── */}
              <div className="rounded-xl border border-border/50 bg-background/30 p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Game & Platform</span>
                  <span className="text-[10px] text-muted-foreground/50">(optional)</span>
                </div>

                {/* Game Name with datalist autocomplete */}
                <FormField
                  control={form.control}
                  name="gameName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Game Name
                      </FormLabel>
                      <FormControl>
                        <>
                          <Input
                            list="game-suggestions"
                            placeholder='e.g. Elden Ring, Valorant, Cyberpunk 2077…'
                            className="bg-background border-border focus-visible:border-primary transition-colors"
                            disabled={!canPost}
                            {...field}
                          />
                          <datalist id="game-suggestions">
                            {POPULAR_GAMES.map((g) => (
                              <option key={g} value={g} />
                            ))}
                          </datalist>
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Platform — tile picker with "Any" option */}
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-primary" /> Platform
                      </FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PLATFORM_OPTIONS.map(({ value, label, icon }) => {
                          const isSelected = field.value === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!canPost}
                              onClick={() => field.onChange(value)}
                              className={`relative flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                                ${isSelected
                                  ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_rgba(0,212,255,0.25)] scale-[1.03]"
                                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-white"
                                }`}
                            >
                              <span className="text-xl">{icon}</span>
                              <span className="leading-tight text-center">{label}</span>
                              {isSelected && (
                                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── OPTIONAL: Play Style ── */}
              <FormField
                control={form.control}
                name="playStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Preferred Play Style
                      <span className="text-[10px] font-normal text-muted-foreground/50">(optional)</span>
                    </FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PLAY_STYLE_OPTIONS.map(({ value, label, emoji, desc, color }) => {
                        const isSelected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={!canPost}
                            onClick={() => field.onChange(value)}
                            className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                              ${isSelected
                                ? `${color} shadow-[0_0_10px_rgba(0,212,255,0.15)] scale-[1.02]`
                                : "border-border bg-background/60 hover:border-primary/30"
                              }`}
                          >
                            <span className="text-lg leading-none mt-0.5 shrink-0">{emoji}</span>
                            <div>
                              <div className={`text-xs font-bold ${isSelected ? "" : "text-white"}`}>{label}</div>
                              <p className={`text-[10px] leading-snug mt-0.5 ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                                {desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── OPTIONAL: Extra Details ── */}
              <div className="rounded-xl border border-border/50 bg-background/30 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Extra Details</span>
                  <span className="text-[10px] text-muted-foreground/50">(optional)</span>
                </div>

                {/* Additional Goals */}
                <FormField
                  control={form.control}
                  name="additionalGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Any bonus objectives or requirements?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Bonus goals or extra context:\n• "Bonus if you help me unlock the X achievement"\n• "Flexible on strategy, just want to win"\n• "Please be patient — I'm still learning"`}
                          className="resize-none h-24 bg-background border-border focus-visible:border-primary transition-colors leading-relaxed"
                          disabled={!canPost}
                          maxLength={300}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expected Duration */}
                <FormField
                  control={form.control}
                  name="expectedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-cyan-400" /> Expected Duration
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. "2–3 hours", "one evening", "until we win"'
                          disabled={!canPost}
                          className="bg-background border-border focus-visible:border-primary transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Minimum Hiring Fee ── */}
              <div
                className="rounded-xl border p-5 space-y-4"
                style={{ borderColor: "rgba(0,212,255,0.30)", background: "rgba(0,212,255,0.04)" }}
              >
                <div className="flex items-center gap-2">
                  {hirerRegion === "india" ? (
                    <IndianRupee className="h-4 w-4 text-amber-400" />
                  ) : (
                    <DollarSign className="h-4 w-4 text-green-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Minimum Bid</span>
                  <span className="text-[10px] text-muted-foreground/50">(required)</span>
                </div>

                {/* Region selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary" /> Your Region
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "india", label: "🇮🇳 India", sub: "Min ₹200/quest" },
                      { value: "international", label: "🌍 International", sub: "Min $5/quest" },
                    ] as const).map(({ value, label, sub }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={!canPost}
                        onClick={() => setHirerRegion(value)}
                        className={`flex flex-col items-start gap-0.5 p-3.5 rounded-xl border text-left text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                          hirerRegion === value
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/40 bg-background/20 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="text-sm leading-tight">{label}</span>
                        <span className="text-[10px] font-bold opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimum bid info */}
                <div
                  className="rounded-lg p-3.5 flex items-start gap-3"
                  style={{
                    background: hirerRegion === "india" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
                    border: hirerRegion === "india" ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <Info className={`h-4 w-4 shrink-0 mt-0.5 ${hirerRegion === "india" ? "text-amber-400" : "text-green-400"}`} />
                  <div className="space-y-1 text-xs">
                    <div className={`font-bold ${hirerRegion === "india" ? "text-amber-300" : "text-green-300"}`}>
                      {hirerRegion === "india"
                        ? "Minimum bid is ₹200 per quest to ensure fair pay for the Gamer."
                        : "Minimum bid is $5 USD per quest to ensure fair pay for the Gamer."}
                    </div>
                    <div className="text-muted-foreground/70">
                      Gamers bid a flat amount to complete your quest.{" "}
                      <span className={`font-black ${hirerRegion === "india" ? "text-amber-300" : "text-green-300"}`}>
                        {minRate.symbol}{minRate.perHour.toLocaleString()} {minRate.currency} minimum
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pro Tip: reward quality */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2.5">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px]">
                    <p className="font-semibold text-primary/90">Pro Tip: better reward = better gamer</p>
                    <p className="text-muted-foreground/70 leading-relaxed">
                      Gamers bid what they think your quest is worth. <span className="text-foreground/80 font-medium">Don't just pick the lowest bid</span> — experienced, friendly, and reliable gamers often bid higher because their time and skill is worth it. For the best experience, consider accepting a mid-to-high bid.
                    </p>
                    <p className="text-muted-foreground/50">
                      Low-reward quests tend to attract fewer bids, or bids from less experienced players.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Gamer Preferences ── */}
              <div className="rounded-xl border border-border/50 bg-background/30 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gamer Preferences</span>
                  <span className="text-[10px] text-muted-foreground/50">(optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-amber-400" /> Preferred Nation
                    </label>
                    <CountryCombobox
                      value={preferredCountry}
                      onValueChange={setPreferredCountry}
                      disabled={!canPost}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <UserRound className="h-3 w-3 text-pink-400" /> Preferred Gender
                    </label>
                    <GenderSelect
                      value={preferredGender}
                      onValueChange={setPreferredGender}
                      disabled={!canPost}
                    />
                  </div>
                </div>
              </div>

              {/* ── Request Expiry ── */}
              <div className="rounded-xl border border-border/50 bg-background/30 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quest Expiry</span>
                  <span className="text-[10px] text-muted-foreground/50">(auto-close if 0 bids)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { value: "forever", label: "♾️ Forever",  desc: "Never auto-closes" },
                    { value: "24h",     label: "⏰ 24 Hours", desc: "Closes if no bids" },
                    { value: "48h",     label: "⏰ 48 Hours", desc: "Closes if no bids" },
                    { value: "7d",      label: "📅 7 Days",   desc: "Closes if no bids" },
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setExpiryOption(value)}
                      disabled={!canPost}
                      className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all duration-200 ${
                        expiryOption === value
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/40 bg-background/20 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="text-sm leading-tight">{label}</span>
                      <span className="text-[10px] font-normal opacity-60">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quest preview summary */}
              {objectivesValue.length >= 10 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Quest Preview</div>
                  <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{objectivesValue}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {gameNameValue && (
                      <span className="bg-background border border-border rounded px-2.5 py-1 font-semibold text-white text-xs">
                        🎮 {gameNameValue}
                      </span>
                    )}
                    {selectedPlatform && selectedPlatform !== "any" && (
                      <span className="bg-background border border-border rounded px-2.5 py-1 font-semibold text-muted-foreground text-xs">
                        {PLATFORM_OPTIONS.find(p => p.value === selectedPlatform)?.icon} {selectedPlatform}
                      </span>
                    )}
                    {selectedPlayStyle && selectedPlayStyle !== "any" && (
                      <span className="bg-background border border-border rounded px-2.5 py-1 font-semibold text-cyan-400 text-xs">
                        {PLAY_STYLE_OPTIONS.find(s => s.value === selectedPlayStyle)?.emoji} {selectedPlayStyle}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Cost notice + submit */}
              <div className="border-t border-border pt-5 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Cost per quest post</span>
                  <span className="font-bold text-white">$10.75</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Hiring Wallet after posting</span>
                  <span className={`font-bold ${canPost ? "text-primary" : "text-destructive"}`}>
                    {canPost
                      ? `$${(hiringBalance - 10.75).toFixed(2)}`
                      : "Insufficient funds"}
                  </span>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-base py-6 shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] transition-all disabled:opacity-50 disabled:shadow-none"
                  disabled={!canPost || postRequest.isPending}
                >
                  {postRequest.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Posting Quest…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Post Quest · $10.75
                    </span>
                  )}
                </Button>
                {!canPost && (
                  <p className="text-center text-xs text-muted-foreground">
                    <Link href="/add-funds" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Add funds to your Hiring Wallet
                    </Link>{" "}
                    to unlock posting.
                  </p>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
