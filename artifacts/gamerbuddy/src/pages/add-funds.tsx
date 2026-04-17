import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Lock, CheckCircle2, Zap, ShieldCheck,
  Smartphone, AlertCircle, RefreshCw, Wifi, BadgeCheck,
  Wallet, Loader2, Globe,
} from "lucide-react";
import { apiFetch } from "@/lib/bids-api";
import { useAuth } from "@/lib/auth";

// ─── Razorpay global type ────────────────────────────────────────────────────
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; contact?: string; name?: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (resp: { error: { description: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = "amount" | "payment" | "success" | "error";

const PRESETS = [10.75, 25, 50, 100, 250, 500];

const UPI_APPS = [
  { name: "GPay",    bg: "#4285F4", letter: "G" },
  { name: "PhonePe", bg: "#5f259f", letter: "P" },
  { name: "Paytm",   bg: "#00b9f1", letter: "P" },
  { name: "BHIM",    bg: "#ff6b35", letter: "B" },
  { name: "CRED",    bg: "#1a1a2e", letter: "C" },
];

function genRef() {
  return "GBY" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ─── Load Razorpay checkout.js script ────────────────────────────────────────
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.body.appendChild(script);
  });
}

// ─── Processing Overlay ──────────────────────────────────────────────────────
function ProcessingOverlay() {
  const stages = ["Opening Razorpay…", "Verifying transaction…", "Crediting your wallet…"];
  const [stage, setStage] = useState(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl w-full max-w-xs p-7 text-center space-y-6 shadow-2xl"
        style={{ background: "linear-gradient(160deg, #1a0a42 0%, #0a0a1a 100%)", border: "1px solid rgba(168,85,247,0.3)" }}
      >
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <div className="font-extrabold text-white text-lg">{stages[stage]}</div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1.5">
            <Wifi className="h-3.5 w-3.5 text-green-400" /> End-to-end encrypted
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {stages.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-500 ${i <= stage ? "bg-primary w-6 h-2" : "bg-primary/20 w-2 h-2"}`} />
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Do not close this window</div>
      </div>
    </div>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────
function SuccessScreen({
  amount, newBalance, txnRef, onViewWallet, onPostRequest,
}: {
  amount: number; newBalance: number;
  txnRef: string; onViewWallet: () => void; onPostRequest: () => void;
}) {
  const [visible, setVisible] = useState(false);
  React.useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`max-w-md mx-auto transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="h-1 w-full rounded-full mb-6 overflow-hidden bg-green-500/20">
        <div className="h-full bg-green-400 rounded-full" style={{ width: "100%", transition: "width 0.8s ease-out" }} />
      </div>
      <div className="flex justify-center mb-6">
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)", border: "2px solid rgba(34,197,94,0.4)" }}
        >
          <div className="absolute inset-2 rounded-full border border-green-500/20" />
          <CheckCircle2 className="h-12 w-12 text-green-400" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-center mb-6">
        <div className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Payment Successful</div>
        <div className="text-4xl font-black text-white">${amount.toFixed(2)}</div>
        <div className="text-muted-foreground text-sm mt-1">added to your Hiring Wallet</div>
      </div>
      <div className="rounded-2xl overflow-hidden mb-5" style={{ border: "1px solid rgba(168,85,247,0.2)", background: "linear-gradient(160deg, rgba(168,85,247,0.05) 0%, rgba(0,0,0,0.4) 100%)" }}>
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transaction Receipt</span>
          <span className="text-xs text-primary font-mono font-bold">{txnRef}</span>
        </div>
        <div className="border-b border-dashed border-border/40 mx-5" />
        <div className="px-5 py-4 space-y-3">
          {[
            { label: "Amount",          value: `$${amount.toFixed(2)}`,       cls: "text-white font-bold" },
            { label: "Payment via",     value: "Razorpay (UPI / Wallet / Card)", cls: "text-white" },
            { label: "Wallet credited", value: "Hiring Wallet",               cls: "text-white" },
            { label: "New balance",     value: `$${newBalance.toFixed(2)}`,   cls: "text-primary font-bold" },
            { label: "Date",            value: `${dateStr}, ${timeStr}`,      cls: "text-muted-foreground" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className={cls}>{value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-border/40 mx-5" />
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-400 font-semibold">
            <div className="h-2 w-2 rounded-full bg-green-400" /> Confirmed
          </div>
          <ShieldCheck className="h-4 w-4 text-green-400/60" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onViewWallet}
          className="rounded-xl border border-border bg-background/40 py-3.5 font-bold text-sm text-muted-foreground hover:text-white hover:border-primary/40 transition-all"
        >
          View Wallet
        </button>
        <button
          onClick={onPostRequest}
          className="rounded-xl bg-primary py-3.5 font-extrabold text-sm text-white uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-primary/90 transition-all"
        >
          Post a Request
        </button>
      </div>
    </div>
  );
}

// ─── Error Screen ────────────────────────────────────────────────────────────
function ErrorScreen({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="flex justify-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)", border: "2px solid rgba(239,68,68,0.35)" }}
        >
          <AlertCircle className="h-12 w-12 text-red-400" strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Payment Failed</div>
        <div className="text-2xl font-extrabold text-white mb-2">Something went wrong</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left space-y-2">
        <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Common reasons</div>
        {[
          "Payment was cancelled or timed out",
          "Card declined by your bank",
          "UPI PIN entered incorrectly",
          "Network connection interrupted",
        ].map((r) => (
          <div key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-red-400/60 mt-1.5 shrink-0" /> {r}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-border bg-background/40 py-3.5 font-bold text-sm text-muted-foreground hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Change Amount
        </button>
        <button
          onClick={onRetry}
          className="flex-1 rounded-xl bg-primary py-3.5 font-extrabold text-sm text-white uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Razorpay Panel ──────────────────────────────────────────────────────────
function RazorpayPanel({
  amount, userEmail, onSuccess, onError, onProcessing,
}: {
  amount: number;
  userEmail?: string;
  onSuccess: (wallets: any) => void;
  onError: (msg: string) => void;
  onProcessing: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    onProcessing(true);
    try {
      const order = await apiFetch<{
        orderId: string; amountInr: number; amountUsd: number;
        currency: string; keyId: string;
      }>("/api/payments/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });

      await loadRazorpayScript();

      onProcessing(false);

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amountInr * 100),
        currency: order.currency,
        name: "Gamerbuddy",
        description: `Hiring Wallet — $${amount.toFixed(2)} top-up`,
        order_id: order.orderId,
        prefill: { email: userEmail ?? "" },
        theme: { color: "#a855f7" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onError("Payment was cancelled. You can try again.");
          },
        },
        handler: async (response) => {
          onProcessing(true);
          try {
            const wallets = await apiFetch("/api/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amountUsd: amount,
              }),
            });
            onProcessing(false);
            onSuccess(wallets);
          } catch (err: any) {
            onProcessing(false);
            setLoading(false);
            onError(err?.error ?? "Payment verified but wallet credit failed. Contact support with your payment ID.");
          }
        },
      });

      rzp.on("payment.failed", (resp) => {
        setLoading(false);
        onError(resp.error.description ?? "Payment failed. Please try a different method.");
      });

      rzp.open();
    } catch (err: any) {
      setLoading(false);
      onProcessing(false);
      onError(err?.error ?? err?.message ?? "Could not connect to Razorpay. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Payment apps */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3">Supported Payment Apps</div>
        <div className="flex items-center gap-3 flex-wrap">
          {UPI_APPS.map((a) => (
            <div key={a.name} className="flex flex-col items-center gap-1">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg"
                style={{ background: a.bg }}
              >
                {a.letter}
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{a.name}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground text-xs font-bold">+8</div>
            <span className="text-[9px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>

      {/* Amount preview */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">You pay</div>
          <div className="text-3xl font-black text-white">${amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Currency conversion applied at checkout</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Wallet credit</div>
          <div className="text-2xl font-black text-primary">${amount.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Hiring Wallet</div>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-2.5">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">How it works</div>
        {[
          { icon: <Smartphone className="h-4 w-4 text-primary" />, text: "Click Pay — secure Razorpay checkout opens" },
          { icon: <Wallet className="h-4 w-4 text-primary" />, text: "Choose UPI, wallet, card, or net banking" },
          { icon: <CheckCircle2 className="h-4 w-4 text-green-400" />, text: "Complete payment — wallet is credited instantly" },
        ].map(({ icon, text }, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">{icon}</div>
            <span className="text-sm text-muted-foreground">{text}</span>
          </div>
        ))}
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={loading}
        className={`w-full relative overflow-hidden rounded-xl py-4 font-extrabold text-base uppercase tracking-widest transition-all ${
          loading
            ? "bg-primary/30 text-white/40 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/90 shadow-[0_0_28px_rgba(168,85,247,0.4)]"
        }`}
      >
        <div className="flex items-center justify-center gap-2.5">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
          {loading ? "Opening Razorpay…" : `Pay $${amount.toFixed(2)} via Razorpay`}
        </div>
        {!loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Lock className="h-3 w-3 text-green-500" />
        <span>Secured by Razorpay · PCI-DSS Level 1 · 256-bit SSL</span>
      </div>
    </div>
  );
}

// ─── Trust Badges ────────────────────────────────────────────────────────────
function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 border-t border-border/30 mt-4">
      {[
        { icon: <Lock className="h-3.5 w-3.5 text-green-400" />,     label: "SSL Secure" },
        { icon: <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />, label: "PCI DSS" },
        { icon: <BadgeCheck className="h-3.5 w-3.5 text-primary" />,   label: "Razorpay" },
        { icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />, label: "Escrow Protected" },
      ].map((b) => (
        <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
          {b.icon} {b.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AddFunds() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isInternational = user?.country !== "India";

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [txnRef] = useState(genRef);
  const [newBalance, setNewBalance] = useState(0);

  const { data: wallets } = useGetWallets({ query: { queryKey: getGetWalletsQueryKey() } });

  const selectedAmount = parseFloat(amount || customAmount || "0");
  const currentBalance = wallets?.hiringBalance ?? 0;
  const maxCanAdd = Math.max(0, Math.round((1000 - currentBalance) * 100) / 100);
  const isValidAmount = selectedAmount >= 10.75 && selectedAmount <= 1000 && selectedAmount <= maxCanAdd;

  const handleSelectPreset = (val: number) => { setAmount(String(val)); setCustomAmount(""); };
  const handleCustomChange = (val: string) => { setCustomAmount(val); setAmount(""); };

  const handleSuccess = useCallback((updatedWallets: any) => {
    setNewBalance(updatedWallets.hiringBalance ?? 0);
    queryClient.setQueryData(getGetWalletsQueryKey(), updatedWallets);
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    setStep("success");
  }, [queryClient]);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStep("error");
  }, []);

  /* ── SUCCESS ── */
  if (step === "success") {
    return (
      <div className="max-w-md mx-auto mt-6">
        <SuccessScreen
          amount={selectedAmount}
          newBalance={newBalance}
          txnRef={txnRef}
          onViewWallet={() => setLocation("/wallets")}
          onPostRequest={() => setLocation("/post-request")}
        />
      </div>
    );
  }

  /* ── ERROR ── */
  if (step === "error") {
    return (
      <div className="max-w-md mx-auto mt-6">
        <ErrorScreen
          error={errorMsg}
          onRetry={() => setStep("payment")}
          onBack={() => { setStep("amount"); setErrorMsg(""); }}
        />
      </div>
    );
  }

  /* ── PAYMENT ── */
  if (step === "payment") {
    return (
      <div className="max-w-md mx-auto space-y-5">
        {processing && <ProcessingOverlay />}

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("amount")}
            className="h-9 w-9 rounded-xl border border-border bg-background/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="font-extrabold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-400" /> Secure Checkout — Razorpay
            </div>
            <div className="text-xs text-muted-foreground">
              Depositing <span className="text-foreground font-semibold">${selectedAmount.toFixed(2)}</span> to Hiring Wallet
            </div>
          </div>
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-border/60 p-5 bg-card/80">
          <RazorpayPanel
            amount={selectedAmount}
            userEmail={undefined}
            onSuccess={handleSuccess}
            onError={handleError}
            onProcessing={setProcessing}
          />
        </div>

        <TrustBadges />
      </div>
    );
  }

  /* ── AMOUNT SELECTION ── */
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => setLocation("/wallets")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Wallets
      </button>

      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground flex items-center gap-3">
          <Zap className="h-7 w-7 text-primary" /> Add Funds
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Top up your Hiring Wallet to post game requests.</p>
        {wallets && (
          <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Current balance:</span>
            <span className="font-bold text-primary">${wallets.hiringBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* International payment notice */}
      {isInternational && (
        <div
          className="rounded-2xl border p-4 flex gap-3.5 items-start"
          style={{
            borderColor: "rgba(34,211,238,0.25)",
            background: "rgba(34,211,238,0.05)",
          }}
        >
          <Globe className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "rgb(103,232,249)" }} />
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "rgb(103,232,249)" }}>
              A note for international users
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We're currently powered by{" "}
              <span className="text-foreground font-medium">Razorpay</span>, which works great for UPI and Indian cards.
              We know <span className="text-foreground font-medium">Stripe</span> is popular globally and we plan to add it —
              plus more payment options — <span className="text-foreground font-medium">within the next 6 months</span>.
              Thank you for supporting Gamerbuddy! 🙏
            </p>
          </div>
        </div>
      )}

      {/* Amount card */}
      <div className="rounded-2xl border border-border/60 p-5 space-y-5 bg-card/80">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Choose Amount</div>
          <div className="text-[11px] text-muted-foreground/60">
            Min $10.75 · {maxCanAdd < 1000 ? `Max you can add: $${maxCanAdd.toFixed(2)}` : "Max $1,000.00"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {PRESETS.map((preset) => {
            const disabled = preset > maxCanAdd;
            return (
              <button
                key={preset}
                onClick={() => !disabled && handleSelectPreset(preset)}
                disabled={disabled}
                className={`rounded-xl border py-3.5 px-2 text-center font-bold transition-all text-sm ${
                  disabled
                    ? "border-border/30 bg-background/20 text-muted-foreground/30 cursor-not-allowed"
                    : amount === String(preset)
                    ? "border-primary bg-primary/20 text-foreground shadow-[0_0_14px_rgba(168,85,247,0.3)]"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                ${preset === 10.75 ? "10.75" : preset}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Custom Amount</Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
            <Input
              type="number"
              min={10.75}
              max={1000}
              step={0.01}
              placeholder="0.00"
              className="pl-8 bg-background/60"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
            />
          </div>
        </div>

        {maxCanAdd === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Your Hiring Wallet is at the $1,000.00 cap. Spend some funds first before adding more.
          </div>
        )}

        {selectedAmount > 0 && !isValidAmount && maxCanAdd > 0 && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {selectedAmount < 10.75
              ? "Minimum deposit is $10.75"
              : selectedAmount > 1000
              ? "Maximum deposit per transaction is $1,000.00"
              : `Adding $${selectedAmount.toFixed(2)} would exceed the $1,000.00 wallet cap. Max you can add: $${maxCanAdd.toFixed(2)}`}
          </div>
        )}

        {selectedAmount > 0 && isValidAmount && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit amount</span>
              <span className="font-bold text-foreground">${selectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New balance</span>
              <span className="font-bold text-primary">${((wallets?.hiringBalance ?? 0) + selectedAmount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment method info */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">Razorpay — All Payment Methods</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">UPI (GPay, PhonePe, Paytm, BHIM) · Debit/Credit Cards · Net Banking · Wallets</div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <span className="text-amber-300/80">
          Funds in the Hiring Wallet <strong className="text-amber-300">cannot be withdrawn</strong>. They are only used to post and pay for gaming sessions.
        </span>
      </div>

      <button
        onClick={() => setStep("payment")}
        disabled={!isValidAmount}
        className={`w-full rounded-xl py-4 font-extrabold text-base uppercase tracking-widest transition-all ${
          isValidAmount
            ? "bg-primary text-white hover:bg-primary/90 shadow-[0_0_24px_rgba(168,85,247,0.35)]"
            : "bg-primary/20 text-white/30 cursor-not-allowed"
        }`}
      >
        Continue to Checkout — ${isValidAmount ? selectedAmount.toFixed(2) : "0.00"}
      </button>
    </div>
  );
}
