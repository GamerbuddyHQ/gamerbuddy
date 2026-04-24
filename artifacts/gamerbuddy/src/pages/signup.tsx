import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignup } from "@workspace/api-client-react";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gamepad2, ShieldCheck, Gamepad, Trophy, Users, Wallet, Star, Check, X } from "lucide-react";

const signupSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((p) => /[A-Z]/.test(p), "Must contain at least one uppercase letter")
    .refine((p) => /[0-9]/.test(p), "Must contain at least one number"),
  phone:    z.string().min(7, "Valid phone number required"),
});

type PasswordRule = { label: string; test: (v: string) => boolean };

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",      test: (v) => v.length >= 8 },
  { label: "One uppercase letter (A–Z)",  test: (v) => /[A-Z]/.test(v) },
  { label: "One number (0–9)",            test: (v) => /[0-9]/.test(v) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const color = passed === 3 ? "#22c55e" : passed === 2 ? "#f59e0b" : "#ef4444";
  const label = passed === 3 ? "Strong" : passed === 2 ? "Fair" : "Weak";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < passed ? color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
      <div className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <div key={rule.label} className="flex items-center gap-1.5">
              {ok
                ? <Check className="h-3 w-3 text-green-500 shrink-0" />
                : <X className="h-3 w-3 text-red-500 shrink-0" />}
              <span className={`text-[11px] ${ok ? "text-green-400" : "text-muted-foreground"}`}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const signupMutation = useSignup();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const passwordValue = form.watch("password");

  function onSubmit(values: z.infer<typeof signupSchema>) {
    signupMutation.mutate(
      { data: values as any },
      {
        onSuccess: (data) => {
          login(data.user);
          toast({
            title: "Welcome to Gamerbuddy! 🎮",
            description: "Build your Trust Score by completing quests, getting great reviews, and keeping your profile complete.",
          });
          setLocation("/dashboard");
        },
        onError: (error) => {
          const data = (error as any).data;
          const description =
            (data && typeof data === "object" ? data.error || data.message : null) ||
            (error as any).message ||
            "Signup failed. Please check your connection and try again.";
          toast({ title: "Signup failed", description, variant: "destructive" });
        },
      }
    );
  }

  const perks = [
    { icon: Trophy, title: "Ranked by skill",       desc: "Compete and earn based on your real gaming stats" },
    { icon: Wallet, title: "Escrow-protected pay",  desc: "Money held safely — released only after match" },
    { icon: Users,  title: "Live community",         desc: "10,000+ verified gamers across every platform" },
    { icon: Star,   title: "No hidden fees",         desc: "Just 10% when you win — keep the rest" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 mt-6 mb-16 lg:mt-12">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">

        {/* ── Branding panel (desktop left) ── */}
        <div className="order-2 lg:order-1 hidden lg:flex flex-col gap-7 lg:sticky lg:top-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(168,85,247,0.15))", border: "1px solid rgba(168,85,247,0.35)" }}
              >
                <Gamepad2 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Join Gamerbuddy</h2>
                <p className="text-sm text-muted-foreground">Free forever — no ID upload needed</p>
              </div>
            </div>
            <p className="text-base text-muted-foreground/80 leading-relaxed">
              Sign up in under a minute and start browsing gaming requests today. Link a gaming account to unlock bidding and posting.
            </p>
          </div>

          <div className="space-y-3">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 p-4 rounded-xl"
                style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)" }}
                >
                  <Icon className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
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
            <span>No credit card required at signup — your data is encrypted and never sold</span>
          </div>
        </div>

        {/* ── Signup form ── */}
        <div className="order-1 lg:order-2">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #22d3ee, #a855f7, #7c3aed)" }} />

            <CardHeader className="space-y-2 text-center pt-8 pb-4">
              <div className="flex justify-center mb-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.1))",
                    border: "1px solid rgba(168,85,247,0.3)",
                    boxShadow: "0 0 24px rgba(168,85,247,0.15)",
                  }}
                >
                  <Gamepad2 className="h-7 w-7 text-secondary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-extrabold uppercase tracking-tight text-white">Join Gamerbuddy</CardTitle>
              <CardDescription>Create your free account — no ID upload needed</CardDescription>
            </CardHeader>

            <CardContent className="px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Full Name / Gamertag</FormLabel>
                          <FormControl>
                            <Input placeholder="John 'Slayer' Doe" autoComplete="name" {...field} className="bg-background/60" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" autoComplete="tel" {...field} className="bg-background/60" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="gamer@example.com" autoComplete="email" {...field} className="bg-background/60" />
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
                          <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} className="bg-background/60" />
                        </FormControl>
                        <FormMessage />
                        <PasswordStrength password={passwordValue} />
                      </FormItem>
                    )}
                  />

                  <div
                    className="flex items-start gap-3 rounded-xl px-4 py-3.5"
                    style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)" }}
                  >
                    <Gamepad className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white mb-1">How to fully activate your account</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        After signing up: (1) link a gaming account on your profile, (2) wait 24–48 hrs for verification, then (3) pay a small one-time activation fee (🇮🇳 ₹149 / 🌍 $5) to unlock posting and bidding. Paid once — never again. ❤️
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-black uppercase tracking-widest mt-2 py-5"
                    style={{ background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", boxShadow: "0 4px 20px rgba(147,51,234,0.35)" }}
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? "Creating Account..." : "Create Free Account"}
                  </Button>
                </form>
              </Form>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground/60">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                Your data is encrypted and never sold
              </div>
            </CardContent>

            <CardFooter className="justify-center text-sm text-muted-foreground pb-6">
              Already have an account?{" "}
              <Link href="/login" className="ml-1 text-primary hover:underline font-semibold">Log in</Link>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  );
}
