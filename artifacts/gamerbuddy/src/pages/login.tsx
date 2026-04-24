import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, ShieldCheck, Lock, AlertTriangle, Trophy, Users, Wallet, Star, FlaskConical, UserCheck, Swords, Eye, EyeOff } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

const loginSchema = z.object({
  email:      z.string().email("Invalid email address"),
  password:   z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

function useCountdown(targetISO: string | null): number {
  const [secsLeft, setSecsLeft] = useState(0);
  useEffect(() => {
    if (!targetISO) { setSecsLeft(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((new Date(targetISO).getTime() - Date.now()) / 1000));
      setSecsLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);
  return secsLeft;
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const [lockedUntil, setLockedUntil]             = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [testLoading, setTestLoading]             = useState<"hirer" | "gamer" | null>(null);
  const [showPassword, setShowPassword]           = useState(false);

  async function handleTestLogin(role: "hirer" | "gamer") {
    setTestLoading(role);
    try {
      const res = await fetch(`${API_BASE}/auth/test-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test login failed");
      login(data.user);
      toast({
        title: `Logged in as ${role === "hirer" ? "Test Hirer" : "Test Gamer"}`,
        description: role === "hirer"
          ? "Welcome, Alex Rivera! $50 in your hiring wallet."
          : 'Welcome, Jordan "Byte" Patel! Trust Factor: 92.',
      });
      setLocation("/browse");
    } catch (err: any) {
      toast({ title: "Test login failed", description: err.message, variant: "destructive" });
    } finally {
      setTestLoading(null);
    }
  }

  const secsLeft = useCountdown(lockedUntil);
  const isLocked = secsLeft > 0;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const ADMIN_EMAIL = "gamerbuddyhq@gmail.com";

  function onSubmit(values: z.infer<typeof loginSchema>) {
    if (isLocked) return;

    if (values.email.toLowerCase().trim() === ADMIN_EMAIL) {
      setLocation("/admin/login");
      return;
    }

    loginMutation.mutate(
      { data: { email: values.email, password: values.password, rememberMe: values.rememberMe ?? false } },
      {
        onSuccess: (data) => {
          setLockedUntil(null);
          setAttemptsRemaining(null);
          login(data.user);
          const sessionLabel = values.rememberMe ? "30-day session started." : "Successfully logged in.";
          toast({ title: "Welcome back", description: sessionLabel });
          setLocation("/dashboard");
        },
        onError: (err) => {
          const body = (err as any).data as {
            error?: string;
            lockedUntil?: string;
            attemptsRemaining?: number;
          } | null | undefined;
          const errorMessage = body?.error || (err as any).message || "Invalid email or password.";

          if (body?.lockedUntil) {
            setLockedUntil(body.lockedUntil);
            setAttemptsRemaining(null);
          } else if (typeof body?.attemptsRemaining === "number") {
            setAttemptsRemaining(body.attemptsRemaining);
            if (body.attemptsRemaining <= 0) {
              toast({ title: "Account locked", description: errorMessage, variant: "destructive" });
            }
          } else {
            toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
          }
        },
      }
    );
  }

  const featureItems = [
    { icon: Trophy, label: "Skill-based matchmaking", desc: "Find players at your exact level" },
    { icon: Wallet, label: "Razorpay escrow",         desc: "Funds held safely until the game ends" },
    { icon: Users,  label: "Verified community",      desc: "Real gamers with linked accounts" },
    { icon: Star,   label: "10% platform fee only",   desc: "The rest goes straight to you" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 mt-8 mb-16 lg:mt-14">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

        {/* ── Left: Login Form ── */}
        <div>
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0099bb, #00D4FF, #22d3ee)" }} />

            <CardHeader className="space-y-2 text-center pt-8 pb-4">
              <div className="flex justify-center mb-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(34,211,238,0.1))",
                    border: "1px solid rgba(0,212,255,0.3)",
                    boxShadow: "0 0 24px rgba(0,212,255,0.15)",
                  }}
                >
                  <Gamepad2 className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-extrabold uppercase tracking-tight text-white">Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>

            <CardContent className="px-6 space-y-4">
              {/* Lockout banner */}
              {isLocked && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}
                >
                  <Lock className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <p className="font-bold text-red-400 leading-snug">Account temporarily locked</p>
                    <p className="text-red-300/80 text-xs mt-0.5">
                      Too many failed login attempts. Unlocks in{" "}
                      <span className="font-black tabular-nums">{fmtCountdown(secsLeft)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Attempts warning */}
              {!isLocked && attemptsRemaining !== null && attemptsRemaining > 0 && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.28)" }}
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
                  <p className="text-amber-300/90 text-xs leading-relaxed">
                    Incorrect credentials.{" "}
                    <span className="font-bold text-amber-300">
                      {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
                    </span>{" "}
                    before your account is locked for 15 minutes.
                  </p>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="gamer@example.com"
                            autoComplete="email"
                            disabled={isLocked}
                            {...field}
                            className="bg-background/60"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              disabled={isLocked}
                              {...field}
                              className="bg-background/60 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                              tabIndex={-1}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ── Remember Me ── */}
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2.5 space-y-0">
                        <FormControl>
                          <Checkbox
                            id="rememberMe"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLocked}
                            className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </FormControl>
                        <label
                          htmlFor="rememberMe"
                          className="text-xs text-muted-foreground cursor-pointer select-none leading-none"
                        >
                          Remember me{" "}
                          <span className="text-muted-foreground/50">(stay signed in for 30 days)</span>
                        </label>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full font-black uppercase tracking-widest mt-2 py-5"
                    style={isLocked ? {
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.30)",
                      color: "rgba(239,68,68,0.70)",
                    } : {
                      background: "linear-gradient(135deg, #0099bb 0%, #0099bb 100%)",
                      boxShadow: "0 4px 20px rgba(0,212,255,0.35)",
                    }}
                    disabled={loginMutation.isPending || isLocked}
                  >
                    {isLocked
                      ? `Locked · ${fmtCountdown(secsLeft)}`
                      : loginMutation.isPending
                        ? "Authenticating..."
                        : "Log In"}
                  </Button>
                </form>
              </Form>

              <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] text-muted-foreground/60">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                Secured with httpOnly session cookies · Lockout after 5 failed attempts
              </div>
            </CardContent>

            <CardFooter className="justify-center text-sm text-muted-foreground pb-6">
              Don't have an account?{" "}
              <Link href="/signup" className="ml-1 text-primary hover:underline font-semibold">Sign up free</Link>
            </CardFooter>
          </Card>

          {/* ── Test Login Panel (dev only) ── */}
          {import.meta.env.DEV && (
            <div
              className="mt-4 rounded-2xl overflow-hidden"
              style={{ border: "1.5px dashed rgba(251,191,36,0.45)", background: "rgba(251,191,36,0.04)" }}
            >
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-amber-400/20">
                <FlaskConical className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">Quick Test Login</span>
                <span className="ml-auto text-[10px] text-amber-300/60 italic">Dev mode only</span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                  <span className="text-amber-300/80 leading-relaxed">
                    <span className="font-bold text-amber-300">For testing only.</span>{" "}
                    These accounts are seeded automatically. Do not use in production.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTestLogin("hirer")}
                    disabled={testLoading !== null}
                    className="relative flex flex-col items-start gap-2 rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.20) 0%, rgba(99,102,241,0.15) 100%)",
                      border: "1.5px solid rgba(99,102,241,0.40)",
                      boxShadow: "0 2px 12px rgba(99,102,241,0.15)",
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.25)" }}>
                        <UserCheck className="h-3.5 w-3.5 text-indigo-300" />
                      </div>
                      <span className="text-xs font-black text-indigo-200 uppercase tracking-wide">
                        {testLoading === "hirer" ? "Logging in…" : "Test Hirer"}
                      </span>
                    </div>
                    <div className="pl-9 space-y-0.5">
                      <p className="text-[10px] font-bold text-white/80">Alex Rivera · Male, 28</p>
                      <p className="text-[10px] text-indigo-200/60">$50 hiring wallet · ready to post quests</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTestLogin("gamer")}
                    disabled={testLoading !== null}
                    className="relative flex flex-col items-start gap-2 rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,212,255,0.20) 0%, rgba(236,72,153,0.12) 100%)",
                      border: "1.5px solid rgba(0,212,255,0.40)",
                      boxShadow: "0 2px 12px rgba(0,212,255,0.15)",
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(0,212,255,0.25)" }}>
                        <Swords className="h-3.5 w-3.5 text-purple-300" />
                      </div>
                      <span className="text-xs font-black text-purple-200 uppercase tracking-wide">
                        {testLoading === "gamer" ? "Logging in…" : "Test Gamer"}
                      </span>
                    </div>
                    <div className="pl-9 space-y-0.5">
                      <p className="text-[10px] font-bold text-white/80">Jordan "Byte" Patel · Male, 24</p>
                      <p className="text-[10px] text-purple-200/60">Trust 92 · Steam + Epic · Pro carry</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Branding Panel (desktop only) ── */}
        <div className="hidden lg:flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(34,211,238,0.15))", border: "1px solid rgba(0,212,255,0.35)" }}
              >
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Player4Hire</h2>
                <p className="text-sm text-muted-foreground">The gaming marketplace built for players</p>
              </div>
            </div>
            <p className="text-base text-muted-foreground/80 leading-relaxed">
              Connect with skilled players, post gaming requests, and earn real money doing what you love — all secured with escrow.
            </p>
          </div>

          <div className="space-y-3">
            {featureItems.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-3.5 p-4 rounded-xl"
                style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.25)" }}
                >
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs text-green-400"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>All transactions secured with industry-grade encryption and Razorpay escrow</span>
          </div>
        </div>

      </div>
    </div>
  );
}
