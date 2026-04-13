import React, { useState } from "react";
import { useLocation } from "wouter";
import { useDepositHiringWallet, useGetWallets, getGetWalletsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Lock, CheckCircle2, Zap, ShieldCheck } from "lucide-react";

type Step = "amount" | "payment" | "success";

const PRESETS = [10.75, 25, 50, 100, 250, 500];

export default function AddFunds() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");

  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("12/27");
  const [cvv, setCvv] = useState("123");

  const { data: wallets } = useGetWallets({ query: { queryKey: getGetWalletsQueryKey() } });
  const depositMutation = useDepositHiringWallet();

  const selectedAmount = parseFloat(amount || customAmount || "0");
  const isValidAmount = selectedAmount >= 10.75 && selectedAmount <= 1000;

  const handleSelectPreset = (val: number) => {
    setAmount(String(val));
    setCustomAmount("");
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setAmount("");
  };

  const handleProceedToPayment = () => {
    if (!isValidAmount) {
      toast({ title: "Invalid Amount", description: "Minimum $10.75 — Maximum $1,000.00", variant: "destructive" });
      return;
    }
    setStep("payment");
  };

  const handleConfirmPayment = () => {
    if (!cardName.trim()) {
      toast({ title: "Missing Info", description: "Please enter the cardholder name.", variant: "destructive" });
      return;
    }

    depositMutation.mutate(
      { data: { amount: selectedAmount } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetWalletsQueryKey(), updated);
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setStep("success");
        },
        onError: (err: any) => {
          toast({ title: "Payment Failed", description: err?.error || "Something went wrong.", variant: "destructive" });
        },
      }
    );
  };

  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">Funds Added!</h1>
          <p className="text-muted-foreground mt-2">
            <span className="text-green-400 font-bold text-xl">${selectedAmount.toFixed(2)}</span> has been added to your Hiring Wallet.
          </p>
        </div>
        <Card className="bg-card/40 border-primary/30 text-left">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount deposited</span>
              <span className="font-bold text-white">${selectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New hiring balance</span>
              <span className="font-bold text-primary">
                ${(wallets?.hiringBalance ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-border" onClick={() => setLocation("/wallets")}>
            View Wallets
          </Button>
          <Button className="flex-1 bg-primary font-bold uppercase" onClick={() => setLocation("/post-request")}>
            Post a Request
          </Button>
        </div>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <button onClick={() => setStep("amount")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-primary" />
            Payment Details
          </h1>
          <p className="text-muted-foreground mt-1">This is a mock payment — no real card will be charged.</p>
        </div>

        <div className="relative rounded-xl overflow-hidden p-5 text-white"
          style={{ background: "linear-gradient(135deg, #2d1b69 0%, #11082a 60%, #0a1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)" }} />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="text-xs uppercase tracking-widest text-purple-300 font-bold">Hiring Wallet Top-up</div>
              <div className="text-2xl font-bold text-purple-200 font-mono">VISA</div>
            </div>
            <div className="font-mono text-lg tracking-widest mb-4 text-white/90">
              {formatCard(cardNumber.replace(/\s/g, "")) || "•••• •••• •••• ••••"}
            </div>
            <div className="flex justify-between items-end text-sm">
              <div>
                <div className="text-xs text-purple-300 uppercase">Card Holder</div>
                <div className="font-semibold">{cardName || "YOUR NAME"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-purple-300 uppercase">Expires</div>
                <div className="font-semibold">{expiry || "MM/YY"}</div>
              </div>
              <div className="bg-white/20 rounded px-3 py-1">
                <div className="text-lg font-extrabold text-white">${selectedAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-border bg-card/50">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Card Number</Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                className="bg-background font-mono tracking-wider"
                maxLength={19}
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Cardholder Name</Label>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="bg-background"
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Expiry</Label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="bg-background font-mono"
                  maxLength={5}
                  placeholder="MM/YY"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">CVV</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="bg-background font-mono"
                  maxLength={4}
                  type="password"
                  placeholder="•••"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-green-500" />
          <span>This is a <strong className="text-white">mock payment demo</strong>. No real charges will occur.</span>
        </div>

        <Button
          className="w-full bg-primary font-extrabold uppercase tracking-wider text-base py-6"
          onClick={handleConfirmPayment}
          disabled={depositMutation.isPending}
        >
          {depositMutation.isPending
            ? "Processing..."
            : `Confirm Payment · $${selectedAmount.toFixed(2)}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => setLocation("/wallets")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Wallets
      </button>

      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Zap className="h-7 w-7 text-primary" />
          Add Funds
        </h1>
        <p className="text-muted-foreground mt-1">Top up your Hiring Wallet to post game requests.</p>
        {wallets && (
          <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Current balance:</span>
            <span className="font-bold text-primary">${wallets.hiringBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Choose Amount</CardTitle>
          <CardDescription>Min $10.75 — Max $1,000.00</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-lg border py-3 px-2 text-center font-bold transition-all text-sm ${
                  amount === String(preset)
                    ? "border-primary bg-primary/20 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-white"
                }`}
              >
                ${preset === 10.75 ? "10.75" : preset}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <Input
                type="number"
                min={10.75}
                max={1000}
                step={0.01}
                placeholder="0.00"
                className="pl-8 bg-background"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
              />
            </div>
          </div>

          {selectedAmount > 0 && !isValidAmount && (
            <p className="text-xs text-destructive font-medium">
              {selectedAmount < 10.75 ? "Minimum amount is $10.75" : "Maximum amount is $1,000.00"}
            </p>
          )}

          {selectedAmount > 0 && isValidAmount && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit amount</span>
                <span className="font-bold text-white">${selectedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New balance</span>
                <span className="font-bold text-primary">${((wallets?.hiringBalance ?? 0) + selectedAmount).toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300/80">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <span>Funds deposited to the Hiring Wallet <strong className="text-amber-300">cannot be withdrawn</strong>. They can only be used to post game requests on Gamerbuddy.</span>
      </div>

      <Button
        className="w-full bg-primary font-extrabold uppercase tracking-wider text-base py-6"
        disabled={!isValidAmount}
        onClick={handleProceedToPayment}
      >
        Continue to Payment — ${isValidAmount ? selectedAmount.toFixed(2) : "0.00"}
      </Button>
    </div>
  );
}
