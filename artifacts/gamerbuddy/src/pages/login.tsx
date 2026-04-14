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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, ShieldCheck, Lock, AlertTriangle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
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

  const [lockedUntil, setLockedUntil]         = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const secsLeft = useCountdown(lockedUntil);
  const isLocked = secsLeft > 0;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    if (isLocked) return;

    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setLockedUntil(null);
          setAttemptsRemaining(null);
          login(data.user);
          toast({ title: "Welcome back", description: "Successfully logged in." });
          setLocation("/dashboard");
        },
        onError: (err) => {
          const body = err.error as { error?: string; lockedUntil?: string; attemptsRemaining?: number } | undefined;

          if (body?.lockedUntil) {
            setLockedUntil(body.lockedUntil);
            setAttemptsRemaining(null);
          } else if (typeof body?.attemptsRemaining === "number") {
            setAttemptsRemaining(body.attemptsRemaining);
            if (body.attemptsRemaining <= 0) {
              toast({ title: "Account locked", description: body.error ?? "Too many failed attempts.", variant: "destructive" });
            }
          } else {
            toast({
              title: "Login failed",
              description: body?.error ?? "Unknown error occurred",
              variant: "destructive",
            });
          }
        },
      }
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 mb-16 px-4">
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7, #22d3ee)" }}
        />

        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="flex justify-center mb-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(34,211,238,0.1))",
                border: "1px solid rgba(168,85,247,0.3)",
                boxShadow: "0 0 24px rgba(168,85,247,0.15)",
              }}
            >
              <Gamepad2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold uppercase tracking-tight text-white">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>

        <CardContent className="px-6 space-y-4">
          {/* ── Account locked banner ── */}
          {isLocked && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.30)",
              }}
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

          {/* ── Attempts-remaining warning ── */}
          {!isLocked && attemptsRemaining !== null && attemptsRemaining > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.28)",
              }}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              <p className="text-amber-300/90 text-xs leading-relaxed">
                Incorrect password.{" "}
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isLocked}
                        {...field}
                        className="bg-background/60"
                      />
                    </FormControl>
                    <FormMessage />
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
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 20px rgba(147,51,234,0.35)",
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
          <Link href="/signup" className="ml-1 text-primary hover:underline font-semibold">
            Sign up free
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
