import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/bids-api";
import {
  ShieldCheck, Zap, Globe, IndianRupee, DollarSign,
  CheckCircle2, Lock, RefreshCw, Smartphone, AlertTriangle,
} from "lucide-react";

// ── Razorpay types ────────────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (opts: any) => { open(): void; on(evt: string, cb: (r: any) => void): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

// ── ActivationGate ────────────────────────────────────────────────────────────
// Shown on the dashboard when user.idVerified = true but user.isActivated = false.
export function ActivationGate({
  userEmail,
  userPhone,
  onActivated,
}: {
  userEmail: string;
  userPhone?: string;
  onActivated: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  type ActivationInfo = {
    isActivated: boolean;
    region: "india" | "global";
    amountInr: number;
    amountUsd: number | null;
    label: string;
    razorpayEnabled: boolean;
    keyId: string | null;
    message: string;
  };

  const [info, setInfo] = useState<ActivationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<ActivationInfo>("/api/payments/activation/info")
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!info || info.isActivated || done) return null;

  const isIndia = info.region === "india";
  const feeDisplay = isIndia ? "₹149" : "$5";
  const altFeeDisplay = isIndia ? "~$1.75 USD" : "~₹420 INR";

  async function handleActivate() {
    if (!info) return;
    setPaying(true);
    setErrorMsg("");

    // Dev-mode bypass when Razorpay is not configured
    if (!info.razorpayEnabled || !info.keyId) {
      try {
        setProcessingMsg("Activating account (dev mode)…");
        await apiFetch("/api/payments/activation/verify", {
          method: "POST",
          body: JSON.stringify({ devMode: true }),
        });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setDone(true);
        toast({ title: "Account activated! 🎉", description: "You can now post requests and place bids." });
        onActivated();
      } catch (err: any) {
        setErrorMsg(err?.error ?? "Activation failed. Please try again.");
      } finally {
        setPaying(false);
        setProcessingMsg("");
      }
      return;
    }

    try {
      setProcessingMsg("Creating payment order…");
      const order = await apiFetch<{
        orderId: string; amountInr: number; currency: string; keyId: string;
        region: string; label: string; devMode?: boolean;
      }>("/api/payments/activation/create-order", { method: "POST" });

      await loadRazorpayScript();
      setProcessingMsg("");
      setPaying(false);

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountInr * 100,
        currency: "INR",
        name: "Player4Hire",
        description: `One-time Account Activation Fee (${order.label})`,
        order_id: order.orderId,
        prefill: { email: userEmail, contact: userPhone ?? "" },
        theme: { color: "#ACB5FF" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setProcessingMsg("");
            setErrorMsg("Payment was cancelled. You can try again anytime.");
          },
        },
        handler: async (response: any) => {
          setPaying(true);
          setProcessingMsg("Verifying payment…");
          try {
            await apiFetch("/api/payments/activation/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setDone(true);
            setPaying(false);
            setProcessingMsg("");
            toast({ title: "Account activated! 🎉", description: "You can now post requests and place bids." });
            onActivated();
          } catch (err: any) {
            setPaying(false);
            setProcessingMsg("");
            setErrorMsg(err?.error ?? "Verification failed. Contact support with your payment ID.");
          }
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        setPaying(false);
        setProcessingMsg("");
        setErrorMsg(resp.error?.description ?? "Payment failed. Please try a different method.");
      });

      rzp.open();
    } catch (err: any) {
      setPaying(false);
      setProcessingMsg("");
      setErrorMsg(err?.error ?? err?.message ?? "Could not connect to payment gateway. Please try again.");
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1.5px solid rgba(245,158,11,0.40)",
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(172,181,255,0.05))",
        boxShadow: "0 0 32px rgba(245,158,11,0.08)",
      }}
    >
      {/* Gold top bar */}
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

      <div className="px-6 py-5 space-y-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", boxShadow: "0 0 18px rgba(245,158,11,0.15)" }}
          >
            <Zap className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-base font-extrabold text-foreground uppercase tracking-wide">Activate Your Account</span>
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.30)" }}
              >
                One-Time Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your gaming account has been <strong className="text-green-400">verified</strong>. Pay a small one-time activation fee to unlock the full platform — post requests, place bids, and start earning.
            </p>
          </div>
        </div>

        {/* Fee card */}
        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.20)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isIndia ? "rgba(255,153,0,0.15)" : "rgba(34,197,94,0.12)", border: `1px solid ${isIndia ? "rgba(255,153,0,0.35)" : "rgba(34,197,94,0.30)"}` }}
            >
              {isIndia
                ? <IndianRupee className="h-5 w-5 text-amber-400" />
                : <DollarSign className="h-5 w-5 text-green-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground">{feeDisplay}</span>
                <span className="text-xs text-muted-foreground/70">{altFeeDisplay}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isIndia
                  ? <><span className="text-[10px] font-bold text-amber-400/80">🇮🇳 India pricing</span></>
                  : <><Globe className="h-3 w-3 text-muted-foreground/60" /><span className="text-[10px] font-bold text-muted-foreground/60">Global pricing</span></>
                }
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground/60 leading-relaxed">
              Non-refundable<br />
              <span className="text-amber-400/70 font-semibold">Paid once — forever</span>
            </div>
          </div>
        </div>

        {/* Why this fee */}
        <div
          className="rounded-lg px-4 py-3.5 space-y-2 text-xs"
          style={{ background: "rgba(172,181,255,0.06)", border: "1px solid rgba(172,181,255,0.16)" }}
        >
          <div className="flex items-center gap-1.5 font-bold text-foreground/90">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            Why do we charge a one-time activation fee?
          </div>
          <p className="text-muted-foreground leading-relaxed">
            To keep Player4Hire <strong className="text-foreground">safe and enjoyable for real gamers</strong>, we charge a small one-time activation fee. Unfortunately, some bad actors create fake or bot accounts to abuse the platform. This small fee helps us greatly reduce spam and maintain a <strong className="text-foreground">high-quality, trustworthy community</strong>.
          </p>
          <p className="text-muted-foreground/70 leading-relaxed">
            This is a <strong className="text-foreground/80">one-time payment</strong> — you won't be charged again. Thank you for understanding and for helping us build a better gaming community together. ❤️
          </p>
        </div>

        {/* What you unlock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: "📋", label: "Post Requests", desc: "Hire gamers for sessions" },
            { icon: "💰", label: "Place Bids", desc: "Earn from open requests" },
            { icon: "🤝", label: "Full Access", desc: "Sessions, chat & more" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.14)" }}
            >
              <span className="text-base">{item.icon}</span>
              <div>
                <div className="font-bold text-foreground">{item.label}</div>
                <div className="text-muted-foreground/60 text-[10px]">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing table */}
        <div className="text-xs text-muted-foreground/70 leading-relaxed">
          One-time only — you'll never be charged again:
          <span className="inline-flex items-center gap-3 ml-2">
            <span className="text-amber-400 font-bold">🇮🇳 India — ₹149</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-green-400 font-bold">🌍 Global — $5</span>
          </span>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-300/90">{errorMsg}</span>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center gap-4 flex-wrap">
          {paying ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              {processingMsg || "Processing…"}
            </div>
          ) : (
            <Button
              onClick={handleActivate}
              className="flex items-center gap-2 h-11 px-6 font-black text-sm uppercase tracking-widest text-black"
              style={{ background: "linear-gradient(135deg,#eab308,#f59e0b)", boxShadow: "0 4px 20px rgba(234,179,8,0.35)" }}
            >
              <Zap className="h-4 w-4" />
              Activate Now — {feeDisplay}
              {!info?.razorpayEnabled && (
                <span className="ml-1 text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-bold">DEV</span>
              )}
            </Button>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Lock className="h-3 w-3" />
            Secured by Razorpay · PCI-DSS Level 1
          </div>
        </div>

        {!info?.razorpayEnabled && (
          <p className="text-[10px] text-muted-foreground/40">
            Dev mode — Razorpay not configured. Clicking "Activate Now" will bypass payment for testing.
          </p>
        )}
      </div>
    </div>
  );
}
