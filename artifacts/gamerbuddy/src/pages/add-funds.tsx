import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useDepositHiringWallet,
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, CreditCard, Lock, CheckCircle2, Zap, ShieldCheck,
  Smartphone, Copy, AlertCircle, RefreshCw, Wifi, BadgeCheck,
  Eye, EyeOff,
} from "lucide-react";

type Step = "amount" | "payment" | "processing" | "success" | "error";
type PayMethod = "upi" | "visa";

const PRESETS = [10.75, 25, 50, 100, 250, 500];
const UPI_ID = "gamerbuddy@upi";

const PROC_STAGES_UPI = [
  "Connecting to UPI network…",
  "Verifying transaction…",
  "Crediting your wallet…",
];
const PROC_STAGES_VISA = [
  "Contacting your bank…",
  "Authorising payment…",
  "Crediting your wallet…",
];

function genRef() {
  return "GBY" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* ── QR CODE visual ─────────────────────────────────────────── */
function QRCode({ size = 180 }: { size?: number }) {
  const cells = React.useMemo(() => {
    const grid: boolean[][] = Array.from({ length: 21 }, () =>
      Array.from({ length: 21 }, () => Math.random() > 0.48)
    );
    const finder = (r: number, c: number) => {
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) grid[r + dr][c + dc] = false;
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) {
          if (dr === 0 || dr === 6 || dc === 0 || dc === 6) grid[r + dr][c + dc] = true;
          if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) grid[r + dr][c + dc] = true;
        }
    };
    finder(0, 0); finder(0, 14); finder(14, 0);
    for (let i = 8; i <= 12; i++) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }
    grid[9][9] = true; grid[10][9] = true; grid[9][10] = true; grid[10][10] = true;
    return grid;
  }, []);

  const cell = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-xl">
      <rect width={size} height={size} fill="#0a0a0f" rx="12" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 1}
              y={r * cell + 1}
              width={cell - 2}
              height={cell - 2}
              fill={
                (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
                  ? "#a855f7"
                  : "rgba(168,85,247,0.75)"
              }
              rx="1"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/* ── UPI STEPS ──────────────────────────────────────────────── */
const UPI_APPS = [
  { name: "GPay", bg: "#4285F4", letter: "G" },
  { name: "PhonePe", bg: "#5f259f", letter: "P" },
  { name: "Paytm", bg: "#00b9f1", letter: "P" },
  { name: "BHIM", bg: "#ff6b35", letter: "B" },
];

function UPIPanel({
  amount,
  onPay,
  loading,
}: {
  amount: number;
  onPay: () => void;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [timerSec, setTimerSec] = useState(600);
  const ref = useRef(genRef());

  useEffect(() => {
    const t = setInterval(() => setTimerSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timerSec / 60)).padStart(2, "0");
  const ss = String(timerSec % 60).padStart(2, "0");
  const expired = timerSec === 0;

  const copyId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* App row */}
      <div className="flex items-center justify-center gap-3">
        {UPI_APPS.map((a) => (
          <div key={a.name} className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg"
              style={{ background: a.bg }}
            >
              {a.letter}
            </div>
            <span className="text-[9px] text-muted-foreground font-medium">{a.name}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground text-xs font-bold">
            +8
          </div>
          <span className="text-[9px] text-muted-foreground">More</span>
        </div>
      </div>

      {/* QR + amount row */}
      <div className="flex gap-4 items-start">
        <div
          className="shrink-0 rounded-2xl p-2 border border-primary/30"
          style={{ background: "#0a0a0f", boxShadow: "0 0 24px rgba(168,85,247,0.2)" }}
        >
          <QRCode size={140} />
          <div className="text-center mt-1.5">
            <div className="text-[9px] text-primary/80 font-bold uppercase tracking-widest">Scan to pay</div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Pay to</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">{UPI_ID}</span>
              <button
                onClick={copyId}
                className={`shrink-0 transition-colors ${copied ? "text-green-400" : "text-muted-foreground hover:text-primary"}`}
              >
                {copied ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {copied && <div className="text-[10px] text-green-400 font-semibold">Copied to clipboard!</div>}
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Amount</div>
            <div className="text-2xl font-black text-white">${amount.toFixed(2)}</div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-2.5 space-y-1">
            <div className="text-[10px] text-muted-foreground">Ref · {ref.current}</div>
            <div className="flex items-center gap-1.5">
              <div
                className={`h-1.5 w-1.5 rounded-full ${expired ? "bg-red-400" : "bg-green-400 animate-pulse"}`}
              />
              <span className={`text-xs font-semibold ${expired ? "text-red-400" : "text-green-400"}`}>
                {expired ? "Expired" : `Expires ${mm}:${ss}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {[
          "Open any UPI app on your phone",
          `Scan the QR or enter UPI ID: ${UPI_ID}`,
          `Enter amount $${amount.toFixed(2)} and confirm`,
          "Click the button below after payment",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-black text-primary mt-0.5">
              {i + 1}
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={onPay}
        disabled={loading || expired}
        className={`w-full relative overflow-hidden rounded-xl py-4 font-extrabold text-sm uppercase tracking-widest transition-all ${
          loading || expired
            ? "bg-primary/30 text-white/40 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/90 shadow-[0_0_24px_rgba(168,85,247,0.35)]"
        }`}
      >
        <div className="flex items-center justify-center gap-2.5">
          <Smartphone className="h-4 w-4" />
          {expired ? "Session Expired — Reload" : `I've Completed the Payment · $${amount.toFixed(2)}`}
        </div>
        {!loading && !expired && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
        )}
      </button>
    </div>
  );
}

/* ── VISA PANEL ─────────────────────────────────────────────── */
function VisaPanel({
  amount,
  onPay,
  loading,
}: {
  amount: number;
  onPay: (name: string, number: string, expiry: string, cvv: string) => void;
  loading: boolean;
}) {
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("12/27");
  const [cvv, setCvv] = useState("123");
  const [showCvv, setShowCvv] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "Enter a valid 16-digit card number";
    if (!cardName.trim()) e.cardName = "Cardholder name is required";
    const [mm] = expiry.split("/");
    if (expiry.length < 5 || parseInt(mm) < 1 || parseInt(mm) > 12) e.expiry = "Invalid expiry (MM/YY)";
    if (cvv.length < 3) e.cvv = "CVV must be 3–4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    setTouched({ cardNumber: true, cardName: true, expiry: true, cvv: true });
    if (validate()) onPay(cardName, cardNumber, expiry, cvv);
  };

  const last4 = cardNumber.replace(/\s/g, "").slice(-4).padStart(4, "•");
  const isValid = (f: string) => touched[f] && !errors[f];
  const hasErr = (f: string) => touched[f] && errors[f];

  const FieldIcon = ({ field }: { field: string }) =>
    isValid(field) ? (
      <CheckCircle2 className="h-4 w-4 text-green-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    ) : hasErr(field) ? (
      <AlertCircle className="h-4 w-4 text-red-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    ) : null;

  return (
    <div className="space-y-4">
      {/* 3D card visual */}
      <div
        className="relative rounded-2xl overflow-hidden p-5 text-white select-none"
        style={{
          background: "linear-gradient(135deg, #3b1d8e 0%, #1a0a42 40%, #0d1b3e 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(168,85,247,0.15)",
          minHeight: "180px",
        }}
      >
        {/* Shimmer stripe */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
          }}
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,1) 8px, rgba(255,255,255,1) 9px)",
          }}
        />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            {/* Chip */}
            <div
              className="w-10 h-7 rounded-md border border-yellow-500/50"
              style={{ background: "linear-gradient(135deg, #c9a227 0%, #f5d97e 40%, #b8891a 100%)" }}
            >
              <div className="grid grid-cols-2 h-full p-0.5 gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-[1px]" style={{ background: "rgba(0,0,0,0.25)" }} />
                ))}
              </div>
            </div>
            {/* Contactless + Visa */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-px">
                {[14, 11, 8, 5].map((w, i) => (
                  <div key={i} className="rounded-full bg-white/50" style={{ width: w, height: 1.5 }} />
                ))}
              </div>
              <div
                className="font-black text-2xl italic tracking-widest"
                style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)", fontFamily: "serif" }}
              >
                VISA
              </div>
            </div>
          </div>

          <div>
            <div className="font-mono text-xl tracking-[0.2em] mb-3 text-white/95" style={{ letterSpacing: "0.18em" }}>
              {formatCard(cardNumber.replace(/\s/g, "")) || "•••• •••• •••• ••••"}
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[9px] text-purple-300/80 uppercase tracking-widest mb-0.5">Card Holder</div>
                <div className="font-semibold text-sm truncate max-w-[140px]">{cardName || "YOUR NAME"}</div>
              </div>
              <div>
                <div className="text-[9px] text-purple-300/80 uppercase tracking-widest mb-0.5">Expires</div>
                <div className="font-semibold text-sm">{expiry || "MM/YY"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-right backdrop-blur-sm">
                <div className="text-[9px] text-purple-200 uppercase tracking-widest">Amount</div>
                <div className="font-black text-base">${amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo hint */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Demo — Test Card</div>
          <button
            onClick={() => { setCardNumber("4111 1111 1111 1111"); setTouched({}); }}
            className="font-mono text-xs text-white hover:text-amber-400 transition-colors"
          >
            4111 1111 1111 1111
          </button>
          <span className="text-xs text-muted-foreground ml-2">· Expiry any future date · CVV any 3 digits</span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Card Number</Label>
          <div className="relative">
            <Input
              value={cardNumber}
              onChange={(e) => { setCardNumber(formatCard(e.target.value)); setTouched((t) => ({ ...t, cardNumber: true })); }}
              onBlur={() => { setTouched((t) => ({ ...t, cardNumber: true })); validate(); }}
              className={`bg-background/60 font-mono tracking-wider pr-10 ${hasErr("cardNumber") ? "border-red-500/60 focus-visible:ring-red-500/30" : isValid("cardNumber") ? "border-green-500/40" : ""}`}
              maxLength={19}
              placeholder="1234 5678 9012 3456"
              autoComplete="cc-number"
            />
            <FieldIcon field="cardNumber" />
          </div>
          {hasErr("cardNumber") && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.cardNumber}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cardholder Name</Label>
          <div className="relative">
            <Input
              value={cardName}
              onChange={(e) => { setCardName(e.target.value); setTouched((t) => ({ ...t, cardName: true })); }}
              onBlur={() => { setTouched((t) => ({ ...t, cardName: true })); validate(); }}
              className={`bg-background/60 pr-10 ${hasErr("cardName") ? "border-red-500/60 focus-visible:ring-red-500/30" : isValid("cardName") ? "border-green-500/40" : ""}`}
              placeholder="As printed on card"
              autoComplete="cc-name"
            />
            <FieldIcon field="cardName" />
          </div>
          {hasErr("cardName") && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.cardName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expiry</Label>
            <div className="relative">
              <Input
                value={expiry}
                onChange={(e) => { setExpiry(formatExpiry(e.target.value)); setTouched((t) => ({ ...t, expiry: true })); }}
                onBlur={() => { setTouched((t) => ({ ...t, expiry: true })); validate(); }}
                className={`bg-background/60 font-mono pr-10 ${hasErr("expiry") ? "border-red-500/60 focus-visible:ring-red-500/30" : isValid("expiry") ? "border-green-500/40" : ""}`}
                maxLength={5}
                placeholder="MM/YY"
                autoComplete="cc-exp"
              />
              <FieldIcon field="expiry" />
            </div>
            {hasErr("expiry") && <p className="text-xs text-red-400">{errors.expiry}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CVV</Label>
            <div className="relative">
              <Input
                value={cvv}
                onChange={(e) => { setCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); setTouched((t) => ({ ...t, cvv: true })); }}
                onBlur={() => { setTouched((t) => ({ ...t, cvv: true })); validate(); }}
                className={`bg-background/60 font-mono pr-16 ${hasErr("cvv") ? "border-red-500/60 focus-visible:ring-red-500/30" : isValid("cvv") ? "border-green-500/40" : ""}`}
                maxLength={4}
                type={showCvv ? "text" : "password"}
                placeholder="•••"
                autoComplete="cc-csc"
              />
              <button
                type="button"
                onClick={() => setShowCvv(!showCvv)}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <FieldIcon field="cvv" />
            </div>
            {hasErr("cvv") && <p className="text-xs text-red-400">{errors.cvv}</p>}
          </div>
        </div>
      </div>

      {/* Pay button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full relative overflow-hidden rounded-xl py-4 font-extrabold text-sm uppercase tracking-widest transition-all ${
          loading
            ? "bg-primary/30 text-white/40 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/90 shadow-[0_0_24px_rgba(168,85,247,0.35)]"
        }`}
      >
        <div className="flex items-center justify-center gap-2.5">
          <Lock className="h-4 w-4" />
          {loading ? "Processing…" : `Pay $${amount.toFixed(2)} Securely`}
        </div>
        {!loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
        <Lock className="h-3 w-3 text-green-500" />
        <span>256-bit SSL · PCI-DSS compliant · No card data stored · Mock demo only</span>
      </div>
    </div>
  );
}

/* ── PROCESSING OVERLAY ─────────────────────────────────────── */
function ProcessingOverlay({ method }: { method: PayMethod }) {
  const stages = method === "upi" ? PROC_STAGES_UPI : PROC_STAGES_VISA;
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl w-full max-w-xs p-7 text-center space-y-6 shadow-2xl"
        style={{ background: "linear-gradient(160deg, #1a0a42 0%, #0a0a1a 100%)", border: "1px solid rgba(168,85,247,0.3)" }}
      >
        {/* Pulsing ring + icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {method === "upi"
              ? <Smartphone className="h-8 w-8 text-primary" />
              : <CreditCard className="h-8 w-8 text-primary" />}
          </div>
        </div>

        {/* Stage text */}
        <div>
          <div className="font-extrabold text-white text-lg">{stages[stage]}</div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1.5">
            <Wifi className="h-3.5 w-3.5 text-green-400" />
            End-to-end encrypted
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {stages.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i <= stage ? "bg-primary w-6 h-2" : "bg-primary/20 w-2 h-2"
              }`}
            />
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
          Do not close this window
        </div>
      </div>
    </div>
  );
}

/* ── SUCCESS SCREEN ─────────────────────────────────────────── */
function SuccessScreen({
  amount,
  payMethod,
  cardLast4,
  newBalance,
  txnRef,
  onViewWallet,
  onPostRequest,
}: {
  amount: number;
  payMethod: PayMethod;
  cardLast4: string;
  newBalance: number;
  txnRef: string;
  onViewWallet: () => void;
  onPostRequest: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`max-w-md mx-auto transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {/* Top success bar */}
      <div className="h-1 w-full rounded-full mb-6 overflow-hidden bg-green-500/20">
        <div className="h-full bg-green-400 rounded-full animate-[expand_0.8s_ease-out_forwards]" style={{ width: 0 }} />
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)", border: "2px solid rgba(34,197,94,0.4)" }}
        >
          <div className="absolute inset-2 rounded-full border border-green-500/20" />
          <CheckCircle2 className="h-12 w-12 text-green-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-6">
        <div className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Payment Successful</div>
        <div className="text-4xl font-black text-white">${amount.toFixed(2)}</div>
        <div className="text-muted-foreground text-sm mt-1">added to your Hiring Wallet</div>
      </div>

      {/* Receipt card */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{ border: "1px solid rgba(168,85,247,0.2)", background: "linear-gradient(160deg, rgba(168,85,247,0.05) 0%, rgba(0,0,0,0.4) 100%)" }}
      >
        {/* Receipt header */}
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transaction Receipt</span>
          <span className="text-xs text-primary font-mono font-bold">{txnRef}</span>
        </div>

        {/* Dashed divider top */}
        <div className="border-b border-dashed border-border/40 mx-5" />

        <div className="px-5 py-4 space-y-3">
          {[
            { label: "Amount", value: `$${amount.toFixed(2)}`, valueClass: "text-white font-bold" },
            { label: "Payment via", value: payMethod === "upi" ? `UPI · ${UPI_ID}` : `Visa ···· ${cardLast4}`, valueClass: "text-white" },
            { label: "Wallet credited", value: "Hiring Wallet", valueClass: "text-white" },
            { label: "New balance", value: `$${newBalance.toFixed(2)}`, valueClass: "text-primary font-bold" },
            { label: "Date", value: `${dateStr}, ${timeStr}`, valueClass: "text-muted-foreground" },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className={valueClass}>{value}</span>
            </div>
          ))}
        </div>

        {/* Dashed divider bottom + status */}
        <div className="border-t border-dashed border-border/40 mx-5" />
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-400 font-semibold">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            Confirmed
          </div>
          <ShieldCheck className="h-4 w-4 text-green-400/60" />
        </div>
      </div>

      {/* CTAs */}
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

/* ── ERROR SCREEN ───────────────────────────────────────────── */
function ErrorScreen({
  error,
  onRetry,
  onBack,
}: {
  error: string;
  onRetry: () => void;
  onBack: () => void;
}) {
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
          "Exceeded maximum deposit limit ($1,000)",
          "Network connection interrupted",
          "UPI transaction timed out",
          "Card declined by your bank",
        ].map((r) => (
          <div key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-red-400/60 mt-1.5 shrink-0" />
            {r}
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

/* ── TRUST BADGES ───────────────────────────────────────────── */
function TrustBadges() {
  const badges = [
    { icon: <Lock className="h-3.5 w-3.5 text-green-400" />, label: "SSL Secure" },
    { icon: <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />, label: "PCI DSS" },
    { icon: <BadgeCheck className="h-3.5 w-3.5 text-primary" />, label: "Verified" },
    { icon: <Wifi className="h-3.5 w-3.5 text-cyan-400" />, label: "Encrypted" },
  ];
  return (
    <div className="flex items-center justify-center gap-5 py-3 border-t border-border/30 mt-4">
      {badges.map((b) => (
        <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
          {b.icon}{b.label}
        </div>
      ))}
    </div>
  );
}

/* ── MAIN COMPONENT ─────────────────────────────────────────── */
export default function AddFunds() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("amount");
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");
  const [amount, setAmount] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showProcessing, setShowProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [txnRef] = useState(genRef);
  const [cardLast4, setCardLast4] = useState("1111");

  const { data: wallets } = useGetWallets({ query: { queryKey: getGetWalletsQueryKey() } });
  const depositMutation = useDepositHiringWallet();

  const selectedAmount = parseFloat(amount || customAmount || "0");
  const isValidAmount = selectedAmount >= 10.75 && selectedAmount <= 1000;

  const handleSelectPreset = (val: number) => { setAmount(String(val)); setCustomAmount(""); };
  const handleCustomChange = (val: string) => { setCustomAmount(val); setAmount(""); };

  const runDeposit = (delay: number) => {
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
            setErrorMsg(err?.error || "An unexpected error occurred. Please try again.");
            setStep("error");
          },
        }
      );
    }, delay);
  };

  const handleUPIPay = () => runDeposit(1800);
  const handleVisaPay = (_name: string, number: string) => {
    setCardLast4(number.replace(/\s/g, "").slice(-4));
    runDeposit(2200);
  };

  /* ── SUCCESS ── */
  if (step === "success") {
    return (
      <div className="max-w-md mx-auto mt-6">
        <SuccessScreen
          amount={selectedAmount}
          payMethod={payMethod}
          cardLast4={cardLast4}
          newBalance={wallets?.hiringBalance ?? 0}
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
          onBack={() => setStep("amount")}
        />
      </div>
    );
  }

  /* ── PAYMENT ── */
  if (step === "payment") {
    return (
      <div className="max-w-md mx-auto space-y-5">
        {showProcessing && <ProcessingOverlay method={payMethod} />}

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("amount")}
            className="h-9 w-9 rounded-xl border border-border bg-background/40 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/40 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="font-extrabold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-400" />
              Secure Checkout
            </div>
            <div className="text-xs text-muted-foreground">
              Depositing <span className="text-white font-semibold">${selectedAmount.toFixed(2)}</span> to Hiring Wallet
            </div>
          </div>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-border/60 bg-background/40">
          {(["upi", "visa"] as PayMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`flex items-center justify-center gap-2.5 py-3 rounded-lg font-bold text-sm transition-all ${
                payMethod === m
                  ? "bg-primary text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {m === "upi" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {m === "upi" ? "UPI" : "Visa Debit"}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          className="rounded-2xl border border-border/60 p-5"
          style={{ background: "linear-gradient(160deg, rgba(168,85,247,0.04) 0%, rgba(0,0,0,0.3) 100%)" }}
        >
          {payMethod === "upi" ? (
            <UPIPanel
              amount={selectedAmount}
              onPay={handleUPIPay}
              loading={showProcessing}
            />
          ) : (
            <VisaPanel
              amount={selectedAmount}
              onPay={handleVisaPay}
              loading={showProcessing}
            />
          )}
        </div>

        <TrustBadges />
      </div>
    );
  }

  /* ── AMOUNT ── */
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => setLocation("/wallets")}
        className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Wallets
      </button>

      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Zap className="h-7 w-7 text-primary" />
          Add Funds
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Top up your Hiring Wallet to post game requests.</p>
        {wallets && (
          <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Current balance:</span>
            <span className="font-bold text-primary">${wallets.hiringBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Amount card */}
      <div className="rounded-2xl border border-border/60 p-5 space-y-5" style={{ background: "linear-gradient(160deg, rgba(168,85,247,0.04) 0%, rgba(0,0,0,0.3) 100%)" }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Choose Amount</div>
          <div className="text-[11px] text-muted-foreground/60">Min $10.75 · Max $1,000.00</div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handleSelectPreset(preset)}
              className={`rounded-xl border py-3.5 px-2 text-center font-bold transition-all text-sm ${
                amount === String(preset)
                  ? "border-primary bg-primary/20 text-white shadow-[0_0_14px_rgba(168,85,247,0.3)]"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-white"
              }`}
            >
              ${preset === 10.75 ? "10.75" : preset}
            </button>
          ))}
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

        {selectedAmount > 0 && !isValidAmount && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {selectedAmount < 10.75 ? "Minimum deposit is $10.75" : "Maximum deposit is $1,000.00"}
          </div>
        )}

        {selectedAmount > 0 && isValidAmount && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 space-y-2 text-sm">
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
      </div>

      {/* Pay method preview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "upi", icon: <Smartphone className="h-5 w-5 text-primary" />, label: "UPI", sub: "GPay · PhonePe · Paytm" },
          { id: "visa", icon: <CreditCard className="h-5 w-5 text-primary" />, label: "Visa Debit", sub: "All Visa cards" },
        ].map((m) => (
          <div key={m.id} className="rounded-xl border border-border/60 bg-background/30 p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              {m.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <span className="text-amber-300/80">
          Funds in the Hiring Wallet <strong className="text-amber-300">cannot be withdrawn</strong>. They are only used to post and pay for gaming sessions.
        </span>
      </div>

      <button
        disabled={!isValidAmount}
        onClick={() => setStep("payment")}
        className={`w-full relative overflow-hidden rounded-xl py-4 font-extrabold text-base uppercase tracking-widest transition-all ${
          isValidAmount
            ? "bg-primary text-white shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:bg-primary/90"
            : "bg-primary/20 text-white/30 cursor-not-allowed"
        }`}
      >
        Continue to Payment · ${isValidAmount ? selectedAmount.toFixed(2) : "0.00"}
        {isValidAmount && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
        )}
      </button>
    </div>
  );
}
