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
    
    // We pass it to the hook as BodyType<SignupBody> but the hook internal customFetch does the FormData conversion as seen in generated api.ts
    signupMutation.mutate(
      { 
        data: {
          ...values,
          officialId: idFile,
        } as any // Cast because the generated hook type might not perfectly match File/Blob
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
    <div className="max-w-xl mx-auto mt-8 mb-16">
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-extrabold uppercase tracking-tight text-white">Create Account</CardTitle>
          <CardDescription>Join the elite gaming marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name / Gamertag</FormLabel>
                      <FormControl>
                        <Input placeholder="John 'Slayer' Doe" {...field} className="bg-background" />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} className="bg-background" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="gamer@example.com" {...field} className="bg-background" />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">
                  Official ID Upload (Required for verification)
                </label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="bg-background file:text-primary file:bg-primary/10 file:border-0 file:mr-4 file:px-4 file:py-2 cursor-pointer hover:file:bg-primary/20 transition-colors"
                />
                <p className="text-[0.8rem] text-muted-foreground">We need this to verify you are a real gamer.</p>
              </div>

              <Button type="submit" className="w-full font-bold uppercase tracking-wider mt-6" disabled={signupMutation.isPending}>
                {signupMutation.isPending ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="ml-1 text-primary hover:underline">
            Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}