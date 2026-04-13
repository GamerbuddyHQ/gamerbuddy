import React, { useState } from "react";
import { useGetWallets, getGetWalletsQueryKey, useDepositHiringWallet, useWithdrawEarningsWallet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";

export default function WalletsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const { data: wallets, isLoading, isError } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() }
  });

  const depositMutation = useDepositHiringWallet();
  const withdrawMutation = useWithdrawEarningsWallet();

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10.75 || amount > 1000) {
      toast({ title: "Invalid Amount", description: "Deposit must be between $10.75 and $1000.", variant: "destructive" });
      return;
    }

    depositMutation.mutate(
      { data: { amount } },
      {
        onSuccess: (newWallets) => {
          queryClient.setQueryData(getGetWalletsQueryKey(), newWallets);
          setDepositAmount("");
          toast({ title: "Deposit Successful", description: `Added $${amount.toFixed(2)} to hiring wallet.`, className: "bg-primary text-white border-primary" });
        },
        onError: (error) => {
          toast({ title: "Deposit Failed", description: error.error?.message || "Unknown error", variant: "destructive" });
        }
      }
    );
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    
    if (!wallets?.canWithdraw) {
      toast({ title: "Cannot Withdraw", description: "Minimum balance of $100 required.", variant: "destructive" });
      return;
    }

    if (amount > (wallets?.earningsBalance || 0)) {
      toast({ title: "Insufficient Balance", description: "You cannot withdraw more than your balance.", variant: "destructive" });
      return;
    }

    withdrawMutation.mutate(
      { data: { amount } },
      {
        onSuccess: (newWallets) => {
          queryClient.setQueryData(getGetWalletsQueryKey(), newWallets);
          setWithdrawAmount("");
          toast({ title: "Withdrawal Initiated", description: `Withdrew $${amount.toFixed(2)} from earnings.`, className: "bg-secondary text-secondary-foreground border-secondary" });
        },
        onError: (error) => {
          toast({ title: "Withdrawal Failed", description: error.error?.message || "Unknown error", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !wallets) {
    return <div className="text-center text-destructive">Failed to load wallets.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          Wallet Management
        </h1>
        <p className="text-muted-foreground mt-2">Manage your funds for hiring and withdraw your earnings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* HIRING WALLET */}
        <Card className="border-primary/30 bg-card/60 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="text-primary uppercase tracking-wider flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" /> Hiring Wallet
            </CardTitle>
            <CardDescription>Use these funds to post game requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="py-4 text-center border-y border-border/50 bg-background/50">
              <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">Current Balance</div>
              <div className="text-5xl font-extrabold text-white">${wallets.hiringBalance.toFixed(2)}</div>
            </div>
            
            <div className="space-y-3">
              <Label>Deposit Funds (Min $10.75)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8 bg-background" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleDeposit} 
                  disabled={depositMutation.isPending}
                  className="bg-primary hover:bg-primary/80 font-bold uppercase"
                >
                  {depositMutation.isPending ? "Processing..." : "Deposit"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Note: Hiring wallet funds cannot be withdrawn. Minimum deposit is $10.75 (cost of one request).</p>
            </div>
          </CardContent>
        </Card>

        {/* EARNINGS WALLET */}
        <Card className="border-secondary/30 bg-card/60 relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="text-secondary uppercase tracking-wider flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" /> Earnings Wallet
            </CardTitle>
            <CardDescription>Money earned from completing requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="py-4 text-center border-y border-border/50 bg-background/50">
              <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">Current Balance</div>
              <div className="text-5xl font-extrabold text-white">${wallets.earningsBalance.toFixed(2)}</div>
            </div>
            
            <div className="space-y-3">
              <Label>Withdraw Funds</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8 bg-background" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={!wallets.canWithdraw}
                  />
                </div>
                <Button 
                  onClick={handleWithdraw} 
                  disabled={!wallets.canWithdraw || withdrawMutation.isPending}
                  variant="outline"
                  className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-bold uppercase"
                >
                  {withdrawMutation.isPending ? "Processing..." : "Withdraw"}
                </Button>
              </div>
              {wallets.canWithdraw ? (
                <p className="text-xs text-green-500">You are eligible to withdraw your earnings.</p>
              ) : (
                <p className="text-xs text-destructive">You need a minimum balance of $100.00 to withdraw.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}