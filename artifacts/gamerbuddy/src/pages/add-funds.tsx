import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useDepositHiringWallet,
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, CreditCard, Lock, CheckCircle2, Zap, ShieldCheck,
  Smartphone, Copy, Clock, Wifi,
} from "lucide-react";

type Step = "amount" | "payment" | "processing" | "success";
type PayMethod = "upi" | "visa";

const PRESETS = [10.75, 25, 50, 100, 250, 500];

const TEST_CARDS = [
  { number: "4111 1111 1111 1111", label: "Visa (success)" },
  { number: "4000 0000 0000 9995", label: "Visa (decline test)" },
];

const UPI_ID = "gamerbuddy@upi";

function UPIQRPlaceholder({ amount }: { amount: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className="w-48 h-48 rounded-2xl border-2 border-primary/40 bg-background/80 relative overflow-hidden flex items-center justify-center"
        style={{ boxShadow: "0 0 24px rgba(168,85,247,0.2)" }}
      >
        <div className="absolute inset-0 grid grid-cols-8 gap-0 opacity-30">
          {Array.from({ length: 64 }).map((_, i) => (
            <div
              key={i}
              className="border border-primary/10"
              style={{
                background: Math.random() > 0.55 ? "rgba(168,85,247,0.8)" : "transparent",
              }}
            />
          ))}
        </div>
        <div className="relative z-10 w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Scan with any UPI app</div>
        <div className="flex items-center gap-2">
          <div className="font-mono font-bold text-white text-base tracking-wide">{UPI_ID}</div>
          <button
            onClick={() => navigator.clipboard.writeText(UPI_ID)}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Copy UPI ID"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground">Supported: GPay · PhonePe · Paytm · BHIM</div>
      </div>

      <div className="flex items-center gap-3 w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
        <div className="shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Amount</div>
          <div className="text-2xl font-black text-white">${amount.toFixed(2)}</div>
        </div>
        <div className="flex-1 border-l border-border/60 pl-3">
          <div className="text-xs text-muted-foreground">UPI Reference</div>
          <div className="font-mono text-xs text-primary font-bold">GBY{Date.now().toString().slice(-8)}</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Waiting for payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingOverlay({ method }: { method: PayMethod }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-xs w-full shadow-2xl">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          {method === "upi"
            ? <Smartphone className="absolute inset-0 m-auto h-7 w-7 text-primary" />
            : <CreditCard className="absolute inset-0 m-auto h-7 w-7 text-primary" />}
        </div>
        <div>
          <div className="font-bold text-white text-lg">
            {method === "upi" ? "Verifying UPI" : "Processing Card"}{dots}
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            Secure encrypted connection
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          This may take a few seconds
        </div>
      </div>
    </div>
  );
}

export default function AddFunds() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("amount");
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");
  const [amount, setAmount] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showProcessing, setShowProcessing] = useState(false);

  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("12/27");
  const [cvv, setCvv] = useState("123");

  const { data: wallets } = useGetWallets({ query: { queryKey: getGetWalletsQueryKey() } });
  const depositMutation = useDepositHiringWallet();

  const selectedAmount = parseFloat(amount || customAmount || "0");
  const isValidAmount = selectedAmount >= 10.75 && selectedAmount <= 1000;

  const handleSelectPreset = (val: number) => { setAmount(String(val)); setCustomAmount(""); };
  const handleCustomChange = (val: string) => { setCustomAmount(val); setAmount(""); };

  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const runDeposit = () => {
    setShowProcessing(true);
    setTimeout(() => {
      depositMutation.mutate(
        { data: { amount: selectedAmount } },
        {
          onSuccess: (updated) => {
            queryClient.setQueryData(getGetWalletsQueryKey(), updated);
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
            setShowProcessing(false);
            setStep("success");
          },
          onError: (err: any) => {
            setShowProcessing(false);
            toast({ title: "Payment Failed", description: err?.error || "Something went wrong.", variant: "destructive" });
          },
        }
      );
    }, payMethod === "upi" ? 1800 : 2200);
  };

  const handleConfirmUPI = () => runDeposit();

  const handleConfirmCard = () => {
    if (!cardName.trim()) {
      toast({ title: "Missing Info", description: "Please enter the cardholder name.", variant: "destructive" });
      return;
    }
    const rawDigits = cardNumber.replace(/\s/g, "");
    if (rawDigits.length < 16) {
      toast({ title: "Invalid Card", description: "Please enter a 16-digit card number.", variant: "destructive" });
      return;
    }
    runDeposit();
  };

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-6">
        {showProcessing && <ProcessingOverlay method={payMethod} />}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center shadow-[0_0_32px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">Funds Added!</h1>
          <p className="text-muted-foreground mt-2">
            <span className="text-green-400 font-bold text-xl">${selectedAmount.toFixed(2)}</span> has been added to your Hiring Wallet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            via {payMethod === "upi" ? `UPI · ${UPI_ID}` : `Visa ···· ${cardNumber.replace(/\s/g, "").slice(-4)}`}
          </p>
        </div>
        <Card className="bg-card/40 border-primary/30 text-left">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount deposited</span>
              <span className="font-bold text-white">${selectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-bold text-white">{payMethod === "upi" ? "UPI" : "Visa Debit"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New hiring balance</span>
              <span className="font-bold text-primary">${(wallets?.hiringBalance ?? 0).toFixed(2)}</span>
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
      <div className="max-w-md mx-auto space-y-5">
        {showProcessing && <ProcessingOverlay method={payMethod} />}

        <button onClick={() => setStep("amount")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
            <Lock className="h-6 w-6 text-green-400" />
            Secure Payment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Depositing <span className="text-white font-bold">${selectedAmount.toFixed(2)}</span> to your Hiring Wallet
          </p>
        </div>

        {/* Method Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background/60 border border-border rounded-xl">
          <button
            onClick={() => setPayMethod("upi")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              payMethod === "upi"
                ? "bg-primary text-white shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            UPI
          </button>
          <button
            onClick={() => setPayMethod("visa")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              payMethod === "visa"
                ? "bg-primary text-white shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Visa Debit
          </button>
        </div>

        {/* UPI Panel */}
        {payMethod === "upi" && (
          <Card className="border-border bg-card/50">
            <CardContent className="pt-6">
              <UPIQRPlaceholder amount={selectedAmount} />
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/60 rounded-lg border border-border px-3 py-2">
                  <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>This is a <strong className="text-white">mock UPI payment</strong>. No real transaction will be made.</span>
                </div>
                <Button
                  className="w-full bg-primary font-extrabold uppercase tracking-wider text-base py-6"
                  onClick={handleConfirmUPI}
                  disabled={depositMutation.isPending || showProcessing}
                >
                  <Smartphone className="h-5 w-5 mr-2" />
                  I've Paid via UPI · ${selectedAmount.toFixed(2)}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visa Card Panel */}
        {payMethod === "visa" && (
          <div className="space-y-4">
            {/* Card visual */}
            <div
              className="relative rounded-2xl overflow-hidden p-5 text-white"
              style={{ background: "linear-gradient(135deg, #2d1b69 0%, #11082a 60%, #0a1a2e 100%)" }}
            >
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.04) 10px, rgba(255,255,255,.04) 20px)" }} />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-xs uppercase tracking-widest text-purple-300 font-bold">Hiring Wallet Top-up</div>
                  <div className="font-bold text-purple-200 text-xl italic tracking-widest">VISA</div>
                </div>
                <div className="font-mono text-lg tracking-widest mb-5 text-white/90">
                  {formatCard(cardNumber.replace(/\s/g, "")) || "•••• •••• •••• ••••"}
                </div>
                <div className="flex justify-between items-end text-sm">
                  <div>
                    <div className="text-[10px] text-purple-300 uppercase tracking-widest">Card Holder</div>
                    <div className="font-semibold">{cardName || "YOUR NAME"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-purple-300 uppercase tracking-widest">Expires</div>
                    <div className="font-semibold">{expiry || "MM/YY"}</div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1.5">
                    <div className="text-xs text-purple-200 uppercase">Amount</div>
                    <div className="text-base font-black text-white">${selectedAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-border bg-card/50">
              <CardContent className="pt-5 space-y-4">
                {/* Test card hint */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Demo Test Cards</div>
                  {TEST_CARDS.map((tc) => (
                    <button
                      key={tc.number}
                      onClick={() => setCardNumber(tc.number)}
                      className="w-full text-left flex items-center justify-between text-xs py-0.5 hover:text-amber-400 transition-colors"
                    >
                      <span className="font-mono text-white">{tc.number}</span>
                      <span className="text-muted-foreground">{tc.label}</span>
                    </button>
                  ))}
                </div>

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
                    autoComplete="cc-name"
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
                      autoComplete="cc-exp"
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
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span>256-bit SSL encrypted. <strong className="text-white">Mock demo</strong> — no real card will be charged.</span>
            </div>

            <Button
              className="w-full bg-primary font-extrabold uppercase tracking-wider text-base py-6"
              onClick={handleConfirmCard}
              disabled={depositMutation.isPending || showProcessing}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Confirm Payment · ${selectedAmount.toFixed(2)}
            </Button>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-1 border-t border-border/40">
          {[
            { icon: <Lock className="h-3.5 w-3.5" />, label: "SSL Secure" },
            { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "PCI Compliant" },
            { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Mock Demo" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
              {b.icon}{b.label}
            </div>
          ))}
        </div>
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
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5 text-sm">
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

      {/* Payment method preview */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-1">Payment Options</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background/40 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">UPI</div>
              <div className="text-[10px] text-muted-foreground">GPay · PhonePe · Paytm</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Visa Debit</div>
              <div className="text-[10px] text-muted-foreground">All Visa cards</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300/80">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <span>Funds in the Hiring Wallet <strong className="text-amber-300">cannot be withdrawn</strong>. They can only be used to post and pay for game sessions.</span>
      </div>

      <Button
        className="w-full bg-primary font-extrabold uppercase tracking-wider text-base py-6"
        disabled={!isValidAmount}
        onClick={() => setStep("payment")}
      >
        Continue to Payment — ${isValidAmount ? selectedAmount.toFixed(2) : "0.00"}
      </Button>
    </div>
  );
}
