import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useCreateRequest, 
  useGetWallets, 
  getGetWalletsQueryKey,
  CreateRequestBodyPlatform,
  CreateRequestBodySkillLevel 
} from "@workspace/api-client-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Zap } from "lucide-react";

const requestSchema = z.object({
  gameName: z.string().min(1, "Game name is required"),
  platform: z.nativeEnum(CreateRequestBodyPlatform, { required_error: "Select a platform" }),
  skillLevel: z.nativeEnum(CreateRequestBodySkillLevel, { required_error: "Select a skill level" }),
  objectives: z.string().min(10, "Provide clear objectives for the session (min 10 characters)"),
});

export default function PostRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateRequest();
  
  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets({
    query: {
      queryKey: getGetWalletsQueryKey()
    }
  });

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      gameName: "",
      objectives: "",
    },
  });

  const canPost = wallets?.canPostRequest ?? false;
  const hiringBalance = wallets?.hiringBalance ?? 0;

  function onSubmit(values: z.infer<typeof requestSchema>) {
    if (!canPost) {
      toast({ title: "Insufficient Funds", description: "You need at least $10.75 in your hiring wallet.", variant: "destructive" });
      return;
    }

    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Request Posted", description: "Your game request is now live.", className: "bg-primary text-white border-primary" });
          setLocation("/my-requests");
        },
        onError: (error) => {
          toast({
            title: "Failed to post",
            description: error.error?.message || error.error?.error || "Unknown error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">Post Request</h1>
        <p className="text-muted-foreground mt-2">Hire a gamer. Each request costs $10.75 from your hiring wallet.</p>
      </div>

      {!isLoadingWallets && !canPost && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient Funds</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between mt-2">
            <span>You have ${hiringBalance.toFixed(2)} in your hiring wallet. You need $10.75 to post a request.</span>
            <Button asChild size="sm" variant="destructive" className="mt-2 sm:mt-0">
              <Link href="/wallets">Deposit Funds</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="uppercase tracking-wide">Mission Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="gameName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Apex Legends, Destiny 2, It Takes Two" {...field} className="bg-background" disabled={!canPost} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canPost}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(CreateRequestBodyPlatform).map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skillLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canPost}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select skill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(CreateRequestBodySkillLevel).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Objectives</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What do you want to accomplish? E.g., 'Need someone to carry me to Platinum rank' or 'Looking to run the new raid, I have no experience.'"
                        className="resize-none h-32 bg-background"
                        disabled={!canPost}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-border">
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold uppercase tracking-widest py-6"
                  disabled={!canPost || createMutation.isPending}
                >
                  {createMutation.isPending ? "Deploying Mission..." : "Post Request (-$10.75)"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}