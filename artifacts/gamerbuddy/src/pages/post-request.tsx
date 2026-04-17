import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CountryCombobox, GenderSelect } from "@/components/country-combobox";
import {
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
  CreateRequestBodyPlatform,
  CreateRequestBodySkillLevel,
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
  Layers,
  Star,
  Users,
  Globe,
  UserRound,
  Clock,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { usePostRequest } from "@/lib/bids-api";

const requestSchema = z.object({
  gameName: z.string().min(1, "Game name is required"),
  platform: z.nativeEnum(CreateRequestBodyPlatform, {
    required_error: "Select a platform",
  }),
  skillLevel: z.nativeEnum(CreateRequestBodySkillLevel, {
    required_error: "Select a skill level",
  }),
  objectives: z
    .string()
    .min(10, "Describe your objectives clearly (min 10 characters)"),
});

type FormValues = z.infer<typeof requestSchema>;

const PLATFORM_META: Record<string, { icon: string; color: string }> = {
  PC: { icon: "🖥️", color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  PlayStation: { icon: "🎮", color: "text-indigo-400 border-indigo-400/40 bg-indigo-400/10" },
  Xbox: { icon: "🟩", color: "text-green-400 border-green-400/40 bg-green-400/10" },
  "Nintendo Switch": { icon: "🕹️", color: "text-red-400 border-red-400/40 bg-red-400/10" },
  "Steam Deck": { icon: "🎲", color: "text-teal-400 border-teal-400/40 bg-teal-400/10" },
  iOS: { icon: "📱", color: "text-slate-300 border-slate-300/40 bg-slate-300/10" },
  Android: { icon: "🤖", color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
};

const SKILL_META: Record<
  string,
  { label: string; desc: string; color: string; stars: number }
> = {
  Beginner: {
    label: "Beginner",
    desc: "New to the game — just learning the ropes.",
    color: "text-green-400 border-green-400/40 bg-green-400/10",
    stars: 1,
  },
  Intermediate: {
    label: "Intermediate",
    desc: "Comfortable with the basics, looking to improve.",
    color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
    stars: 2,
  },
  Expert: {
    label: "Expert",
    desc: "Highly skilled, competitive play required.",
    color: "text-primary border-primary/40 bg-primary/10",
    stars: 3,
  },
  Chill: {
    label: "Chill",
    desc: "No pressure — just vibes and good gameplay.",
    color: "text-secondary border-secondary/40 bg-secondary/10",
    stars: 0,
  },
};

const OBJECTIVES_MAX = 500;

export default function PostRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const postRequest = usePostRequest();
  const [isBulkHiring, setIsBulkHiring] = useState(false);
  const [bulkGamersNeeded, setBulkGamersNeeded] = useState(3);
  const [bulkError, setBulkError] = useState("");
  const [preferredCountry, setPreferredCountry] = useState("any");
  const [preferredGender, setPreferredGender] = useState("any");
  const [expiryOption, setExpiryOption] = useState<"forever" | "24h" | "48h" | "7d">("forever");

  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { gameName: "", objectives: "" },
  });

  const objectivesValue = form.watch("objectives") ?? "";
  const selectedPlatform = form.watch("platform");
  const selectedSkill = form.watch("skillLevel");

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
    if (isBulkHiring) {
      if (bulkGamersNeeded < 3) {
        setBulkError("Minimum is 3 gamers");
        return;
      }
      if (bulkGamersNeeded > 100) {
        setBulkError("Maximum is 100 gamers");
        return;
      }
    }

    postRequest.mutate(
      {
        ...values,
        isBulkHiring,
        bulkGamersNeeded: isBulkHiring ? bulkGamersNeeded : undefined,
        preferredCountry,
        preferredGender,
        expiryOption,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({
            title: isBulkHiring ? "Bulk Mission Posted!" : "Mission Posted!",
            description: isBulkHiring
              ? `Your bulk request for ${bulkGamersNeeded} gamers is live!`
              : "Your game request is now live. Gamers will reach out.",
          });
          setLocation("/my-requests");
        },
        onError: (error: any) => {
          toast({
            title: "Failed to post",
            description:
              error?.error?.message || error?.error?.error || error?.error || "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          Post a Mission
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hire a skilled gamer for your session. Each request costs{" "}
          <span className="text-primary font-semibold">$10.75</span> from your Hiring Wallet.
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
              <div
                className={`text-sm font-bold ${
                  canPost ? "text-green-400" : "text-destructive"
                }`}
              >
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
        {/* Glow bar top */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Mission Details
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">

              {/* Game Name */}
              <FormField
                control={form.control}
                name="gameName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                      Game Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Apex Legends, Elden Ring, It Takes Two…"
                        className="bg-background border-border focus-visible:border-primary transition-colors"
                        disabled={!canPost}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Platform — tile picker */}
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-primary" />
                      Platform <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.values(CreateRequestBodyPlatform).map((p) => {
                        const meta = PLATFORM_META[p] ?? { icon: "🎮", color: "text-muted-foreground border-border bg-background" };
                        const isSelected = field.value === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={!canPost}
                            onClick={() => field.onChange(p)}
                            className={`relative flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                              ${
                                isSelected
                                  ? `${meta.color} shadow-[0_0_12px_rgba(168,85,247,0.25)] scale-[1.03]`
                                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-white"
                              }`}
                          >
                            <span className="text-xl">{meta.icon}</span>
                            <span>{p}</span>
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

              {/* Skill Level — tile picker */}
              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Desired Skill Level <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(CreateRequestBodySkillLevel).map((s) => {
                        const meta = SKILL_META[s];
                        const isSelected = field.value === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={!canPost}
                            onClick={() => field.onChange(s)}
                            className={`flex flex-col gap-1 rounded-lg border p-3.5 text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                              ${
                                isSelected
                                  ? `${meta.color} shadow-[0_0_12px_rgba(168,85,247,0.2)] scale-[1.02]`
                                  : "border-border bg-background/60 hover:border-primary/40"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold ${isSelected ? "" : "text-white"}`}>
                                {meta.label}
                              </span>
                              {meta.stars > 0 ? (
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${i < meta.stars ? "fill-current" : "opacity-20"}`}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs">😎</span>
                              )}
                            </div>
                            <p className={`text-xs leading-snug ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                              {meta.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Objectives */}
              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        Clear Objectives <span className="text-destructive">*</span>
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
                    <FormControl>
                      <Textarea
                        placeholder={`Describe exactly what you need:\n• "Need someone to carry me to Diamond rank in Apex"\n• "Looking for a co-op partner for the new raid, I'm new to this one"\n• "Just want a chill partner to run story missions"`}
                        className="resize-none h-36 bg-background border-border focus-visible:border-primary transition-colors leading-relaxed"
                        disabled={!canPost}
                        maxLength={OBJECTIVES_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nation & Gender Preferences */}
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

              {/* Request Expiry */}
              <div className="rounded-xl border border-border/50 bg-background/30 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Request Expiry</span>
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

              {/* Bulk Hiring — Phase 2 Coming Soon */}
              <div
                className="rounded-xl border p-5 flex items-center gap-4 opacity-60"
                style={{ borderColor: "rgba(34,211,238,0.15)", background: "rgba(34,211,238,0.03)" }}
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,211,238,0.10)", border: "1px solid rgba(34,211,238,0.20)" }}>
                  <Users className="h-4 w-4" style={{ color: "rgba(34,211,238,0.6)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground/60">Bulk Hiring</span>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(34,211,238,0.10)", color: "rgba(34,211,238,0.65)" }}
                    >
                      Phase 2 · Coming Soon
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/45 mt-0.5">Hire 3–100 gamers for raids, events &amp; content creation — unlocking in Phase 2.</p>
                </div>
              </div>

              {/* Preview summary */}
              {selectedPlatform && selectedSkill && form.watch("gameName") && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Mission Preview</div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="bg-background border border-border rounded px-2.5 py-1 font-semibold text-white">
                      {PLATFORM_META[selectedPlatform]?.icon} {selectedPlatform}
                    </span>
                    <span className={`border rounded px-2.5 py-1 font-semibold text-xs ${SKILL_META[selectedSkill]?.color}`}>
                      {selectedSkill}
                    </span>
                    <span className="bg-background border border-border rounded px-2.5 py-1 font-semibold text-white">
                      {form.watch("gameName")}
                    </span>
                  </div>
                </div>
              )}

              {/* Cost notice + submit */}
              <div className="border-t border-border pt-5 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Cost per request</span>
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
                  className="w-full bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-base py-6 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:shadow-none"
                  disabled={!canPost || postRequest.isPending}
                >
                  {postRequest.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Deploying Mission…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Post Mission · $10.75
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
