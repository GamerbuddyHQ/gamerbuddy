import React from "react";
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
import { Gamepad2, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.user);
          toast({ title: "Welcome back", description: "Successfully logged in." });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Login failed",
            description: error.error?.message || error.error?.error || "Unknown error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 mb-16 px-4">
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* themed gradient top bar */}
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

        <CardContent className="px-6">
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
                style={{
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 20px rgba(147,51,234,0.35)",
                }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Authenticating..." : "Log In"}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground/60">
            <ShieldCheck className="h-3 w-3 text-green-500" />
            Secured with 256-bit encryption
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
