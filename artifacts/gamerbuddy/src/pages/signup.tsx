import React, { useState } from "react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, ShieldCheck, Upload, Clock, Info } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number required"),
});

export default function Signup() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const signupMutation = useSignup();
  const [idFile, setIdFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  function onSubmit(values: z.infer<typeof signupSchema>) {
    if (!idFile) {
      toast({ title: "Official ID Required", description: "Please upload an official ID for verification.", variant: "destructive" });
      return;
    }

    signupMutation.mutate(
      {
        data: {
          ...values,
          officialId: idFile,
        } as any,
      },
      {
        onSuccess: (data) => {
          login(data.user);
          toast({ title: "Account created", description: "Welcome to Gamerbuddy." });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Signup failed",
            description: error.error?.message || error.error?.error || "Unknown error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-6 mb-16 px-4">
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* themed gradient top bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #22d3ee, #a855f7, #7c3aed)" }}
        />

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
          <CardDescription>Create your account and start playing or earning</CardDescription>
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
                        <Input
                          placeholder="John 'Slayer' Doe"
                          autoComplete="name"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 000-0000"
                          autoComplete="tel"
                          {...field}
                          className="bg-background/60"
                        />
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
                      <Input
                        placeholder="gamer@example.com"
                        autoComplete="email"
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
                        autoComplete="new-password"
                        {...field}
                        className="bg-background/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ID Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">
                  Official ID Upload{" "}
                  <span className="text-primary normal-case tracking-normal font-semibold">(Required for verification)</span>
                </label>
                <label
                  className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-all ${
                    idFile
                      ? "border-green-500/40 bg-green-500/5 text-green-400"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-white"
                  }`}
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">
                    {idFile ? idFile.name : "Click to upload image or PDF"}
                  </span>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">We need this to verify you are a real gamer. Your ID is stored securely.</p>
              </div>

              {/* Verification timeline notice */}
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(168,85,247,0.07)",
                  border: "1px solid rgba(168,85,247,0.2)",
                }}
              >
                <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">Verification helps keep Gamerbuddy safe</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    It usually takes 7–15 days. You can browse requests right away — posting and hiring unlock once you're verified.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full font-black uppercase tracking-widest mt-2 py-5"
                style={{
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 20px rgba(147,51,234,0.35)",
                }}
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
          <Link href="/login" className="ml-1 text-primary hover:underline font-semibold">
            Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
