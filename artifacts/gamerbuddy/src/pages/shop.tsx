import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart, Key, Zap, X, CheckCircle2, Lock,
  CreditCard, Smartphone, Copy, Wifi, ChevronLeft,
  AlertCircle, ShieldCheck, BadgeCheck, Eye, EyeOff,
} from "lucide-react";

const GAME_KEYS = [
  { id: 1, title: "Apex Legends — Champion Bundle", description: "Unlock 3 exclusive legends skins + 2000 Apex Coins.", platform: "PC / EA App", price: 19.99, tag: "Popular", tagColor: "border-primary/40 text-primary bg-primary/10", icon: "⚡" },
  { id: 2, title: "Valorant — Night Market Pack", description: "5 weapon skins from the exclusive Night Market vault.", platform: "PC / Riot", price: 29.99, tag: "Exclusive", tagColor: "border-secondary/40 text-secondary bg-secondary/10", icon: "🔫" },
  { id: 3, title: "Call of Duty — Season Pass", description: "Unlock the full Battle Pass + 20 tier skips.", platform: "PC / Xbox / PS", price: 14.99, tag: "Best Value", tagColor: "border-green-500/40 text-green-400 bg-green-500/10", icon: "🎖️" },
  { id: 4, title: "Fortnite — 2800 V-Bucks", description: "Top up your V-Bucks and unlock this season's battle pass.", platform: "All Platforms", price: 19.99, tag: "Hot", tagColor: "border-amber-500/40 text-amber-400 bg-amber-500/10", icon: "⭐" },
  { id: 5, title: "Minecraft — Java + Bedrock Bundle", description: "Full access to both versions of Minecraft.", platform: "PC", price: 26.99, tag: null, tagColor: "", icon: "⛏️" },
  { id: 6, title: "League of Legends — RP Pack (10,000)", description: "10,000 Riot Points to spend on champions and skins.", platform: "PC / Riot", price: 49.99, tag: "Mega Pack", tagColor: "border-pink-500/40 text-pink-400 bg-pink-500/10", icon: "👑" },
];

type PayMethod = "upi" | "visa";
type ModalStep = "method" | "upi" | "visa" | "processing" | "done";

const UPI_ID = "gamerbuddy@upi";

const UPI_APPS = [
  { name: "GPay", bg: "#4285F4", letter: "G" },
  { name: "PhonePe", bg: "#5f259f", letter: "P" },
  { name: "Paytm", bg: "#00b9f1", letter: "P" },
  { name: "BHIM", bg: "#ff6b35", letter: "B" },
];

function ShopQRCode({ size = 120 }: { size?: number }) {
  const cells = React.useMemo(() => {
    const g: boolean[][] = Array.from({ length: 21 }, () =>
      Array.from({ length: 21 }, () => Math.random() > 0.48)
    );
    const finder = (r: number, c: number) => {
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) {
          g[r + dr][c + dc] = false;
          if (dr === 0 || dr === 6 || dc === 0 || dc === 6) g[r + dr][c + dc] = true;
          if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) g[r + dr][c + dc] = true;
        }
    };
    finder(0, 0); finder(0, 14); finder(14, 0);
    for (let i = 8; i <= 12; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
    g[9][9] = true; g[10][10] = true; g[9][10] = true; g[10][9] = true;
    return g;
  }, []);

  const cell = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-xl">
      <rect width={size} height={size} fill="#0a0a0f" rx="10" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`} x={c * cell + 0.5} y={r * cell + 0.5} width={cell - 1} height={cell - 1}
              fill={(r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7) ? "#a855f7" : "rgba(168,85,247,0.75)"}
              rx="0.8" />
          ) : null
        )
      )}
    </svg>
  );
}

const PROC_STAGES: Record<PayMethod, string[]> = {
  upi: ["Connecting to UPI network…", "Verifying transaction…", "Generating your key…"],
  visa: ["Contacting your bank…", "Authorising payment…", "Generating your key…"],
};

function ShopProcessing({ method }: { method: PayMethod }) {
  const stages = PROC_STAGES[method];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="py-10 flex flex-col items-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping" style={{ animationDuration: "1.5s" }} />
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          {method === "upi" ? <Smartphone className="h-8 w-8 text-primary" /> : <CreditCard className="h-8 w-8 text-primary" />}
        </div>
      </div>

      <div className="text-center">
        <div className="font-extrabold text-white text-base">{stages[stage]}</div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1.5">
          <Wifi className="h-3 w-3 text-green-400" /> End-to-end encrypted
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {stages.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i <= stage ? "bg-primary w-5 h-2" : "bg-primary/20 w-2 h-2"}`} />
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Do not close this window</div>
    </div>
  );
}

function UPIShopPanel({ price, onPay }: { price: number; onPay: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* App row */}
      <div className="flex items-center justify-center gap-2.5">
        {UPI_APPS.map((a) => (
          <div key={a.name} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
              style={{ background: a.bg }}>
              {a.letter}
            </div>
            <span className="text-[8px] text-muted-foreground">{a.name}</span>
          </div>
        ))}
      </div>

      {/* QR + details */}
      <div className="flex gap-3 items-start">
        <div className="shrink-0 rounded-xl p-1.5 border border-primary/25"
          style={{ background: "#0a0a0f", boxShadow: "0 0 16px rgba(168,85,247,0.15)" }}>
          <ShopQRCode size={110} />
          <div className="text-center mt-1">
            <div className="text-[8px] text-primary/70 font-bold uppercase tracking-widest">Scan to pay</div>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <div className="rounded-xl border border-border bg-background/50 px-3 py-2 space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Pay to</div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-white">{UPI_ID}</span>
              <button onClick={copyId} className={`transition-colors ${copied ? "text-green-400" : "text-muted-foreground hover:text-primary"}`}>
                {copied ? <BadgeCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {copied && <div className="text-[9px] text-green-400 font-semibold">Copied!</div>}
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">Amount</div>
            <div className="text-xl font-black text-white">${price.toFixed(2)}</div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-green-500/5 border border-green-500/20 px-2.5 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-green-400 font-semibold">Awaiting payment</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {["Open any UPI app", `Scan QR or enter ${UPI_ID}`, "Enter amount & confirm", "Click the button below"].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[9px] font-black text-primary shrink-0">{i + 1}</div>
            <span className="text-[11px] text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-background/60 rounded-lg border border-border px-3 py-2">
        <Lock className="h-3 w-3 text-green-500 shrink-0" />
        Mock demo — click below to simulate a successful UPI payment.
      </div>

      <button onClick={onPay}
        className="w-full relative overflow-hidden rounded-xl py-3.5 font-extrabold text-sm uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-4 w-4" />
          I've Completed UPI Payment · ${price.toFixed(2)}
        </div>
      </button>
    </div>
  );
}

function VisaShopPanel({ price, onPay }: { price: number; onPay: (name: string) => void }) {
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("12/27");
  const [cvv, setCvv] = useState("123");
  const [showCvv, setShowCvv] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

  const validate = () => {
    const e: Record<string, string> = {};
    if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "Enter a valid 16-digit number";
    if (!cardName.trim()) e.cardName = "Name is required";
    if (cvv.length < 3) e.cvv = "CVV must be 3–4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = () => {
    setTouched({ cardNumber: true, cardName: true, expiry: true, cvv: true });
    if (validate()) onPay(cardName);
  };

  const isOk = (f: string) => touched[f] && !errors[f];
  const hasErr = (f: string) => touched[f] && errors[f];

  const FieldIcon = ({ field }: { field: string }) =>
    isOk(field) ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      : hasErr(field) ? <AlertCircle className="h-3.5 w-3.5 text-red-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        : null;

  return (
    <div className="space-y-3.5">
      {/* Card preview */}
      <div className="relative rounded-xl overflow-hidden p-4 text-white select-none"
        style={{ background: "linear-gradient(135deg, #3b1d8e 0%, #1a0a42 40%, #0d1b3e 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.4), 0 0 24px rgba(168,85,247,0.1)", minHeight: 140 }}>
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)" }} />
        <div className="relative z-10 h-full flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            {/* Chip */}
            <div className="w-8 h-5 rounded border border-yellow-500/40"
              style={{ background: "linear-gradient(135deg, #c9a227 0%, #f5d97e 40%, #b8891a 100%)" }}>
              <div className="grid grid-cols-2 h-full p-0.5 gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className="rounded-[1px]" style={{ background: "rgba(0,0,0,0.2)" }} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-px">
                {[12, 9, 7, 4].map((w, i) => <div key={i} className="rounded-full bg-white/40" style={{ width: w, height: 1.2 }} />)}
              </div>
              <div className="font-black text-xl italic tracking-widest" style={{ fontFamily: "serif" }}>VISA</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-base tracking-[0.18em] mb-2.5 text-white/90">
              {formatCard(cardNumber.replace(/\s/g, "")) || "•••• •••• •••• ••••"}
            </div>
            <div className="flex justify-between items-end text-xs">
              <div>
                <div className="text-[8px] text-purple-300/70 uppercase tracking-widest">Holder</div>
                <div className="font-semibold">{cardName || "YOUR NAME"}</div>
              </div>
              <div>
                <div className="text-[8px] text-purple-300/70 uppercase tracking-widest">Expires</div>
                <div className="font-semibold">{expiry || "MM/YY"}</div>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-lg px-2.5 py-1">
                <div className="font-black text-sm">${price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test card hint */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Demo Test Card</div>
          <button onClick={() => { setCardNumber("4111 1111 1111 1111"); setTouched({}); }}
            className="font-mono text-[11px] text-white hover:text-amber-400 transition-colors">
            4111 1111 1111 1111
          </button>
          <span className="text-[11px] text-muted-foreground ml-2">· any future expiry · any 3-digit CVV</span>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Card Number</Label>
          <div className="relative">
            <Input value={cardNumber} onChange={(e) => { setCardNumber(formatCard(e.target.value)); setTouched(t => ({ ...t, cardNumber: true })); }}
              onBlur={() => { setTouched(t => ({ ...t, cardNumber: true })); validate(); }}
              className={`bg-background/60 font-mono tracking-wider text-sm pr-9 ${hasErr("cardNumber") ? "border-red-500/50" : isOk("cardNumber") ? "border-green-500/40" : ""}`}
              maxLength={19} placeholder="1234 5678 9012 3456" autoComplete="cc-number" />
            <FieldIcon field="cardNumber" />
          </div>
          {hasErr("cardNumber") && <p className="text-[10px] text-red-400">{errors.cardNumber}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cardholder Name</Label>
          <div className="relative">
            <Input value={cardName} onChange={(e) => { setCardName(e.target.value); setTouched(t => ({ ...t, cardName: true })); }}
              onBlur={() => { setTouched(t => ({ ...t, cardName: true })); validate(); }}
              className={`bg-background/60 text-sm pr-9 ${hasErr("cardName") ? "border-red-500/50" : isOk("cardName") ? "border-green-500/40" : ""}`}
              placeholder="As printed on card" autoComplete="cc-name" />
            <FieldIcon field="cardName" />
          </div>
          {hasErr("cardName") && <p className="text-[10px] text-red-400">{errors.cardName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry</Label>
            <Input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className="bg-background/60 font-mono text-sm" maxLength={5} placeholder="MM/YY" autoComplete="cc-exp" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CVV</Label>
            <div className="relative">
              <Input value={cvv} onChange={(e) => { setCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); setTouched(t => ({ ...t, cvv: true })); }}
                onBlur={() => { setTouched(t => ({ ...t, cvv: true })); validate(); }}
                className={`bg-background/60 font-mono text-sm pr-9 ${hasErr("cvv") ? "border-red-500/50" : isOk("cvv") ? "border-green-500/40" : ""}`}
                maxLength={4} type={showCvv ? "text" : "password"} placeholder="•••" autoComplete="cc-csc" />
              <button type="button" onClick={() => setShowCvv(!showCvv)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {hasErr("cvv") && <p className="text-[10px] text-red-400">{errors.cvv}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Lock className="h-3 w-3 text-green-500" />
        256-bit SSL · PCI-DSS · Mock demo — no real card charged
      </div>

      <button onClick={handlePay}
        className="w-full relative overflow-hidden rounded-xl py-3.5 font-extrabold text-sm uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
        <div className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Pay ${price.toFixed(2)} Securely
        </div>
      </button>
    </div>
  );
}

function ShopSuccess({ item, payMethod, cardName, onClose }: {
  item: typeof GAME_KEYS[0];
  payMethod: PayMethod;
  cardName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fakeKey = React.useMemo(() =>
    `GB-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, []);
  const txnRef = React.useMemo(() => "GBY" + Math.random().toString(36).substring(2, 10).toUpperCase(), []);
  const now = new Date();

  const copyKey = () => {
    navigator.clipboard.writeText(fakeKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-5 space-y-5 text-center">
      {/* Success animation */}
      <div className="flex justify-center">
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)", border: "2px solid rgba(34,197,94,0.4)" }}>
          <CheckCircle2 className="h-9 w-9 text-green-400" strokeWidth={1.5} />
        </div>
      </div>

      <div>
        <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-1">Payment Successful</div>
        <div className="text-xl font-extrabold text-white">{item.title}</div>
        <div className="text-2xl font-black text-white mt-0.5">${item.price.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          paid via {payMethod === "upi" ? `UPI · ${UPI_ID}` : `Visa · ${cardName || "card"}`}
        </div>
      </div>

      {/* Key box */}
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2.5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Your Game Key</div>
        <div className="font-mono text-lg font-black text-secondary tracking-widest">{fakeKey}</div>
        <button onClick={copyKey}
          className={`flex items-center gap-1.5 text-xs mx-auto transition-colors ${copied ? "text-green-400" : "text-muted-foreground hover:text-secondary"}`}>
          {copied ? <BadgeCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied to clipboard!" : "Copy Key"}
        </button>
        <div className="text-xs text-muted-foreground">Redeem on {item.platform} · Single-use only</div>
      </div>

      {/* Mini receipt */}
      <div className="rounded-xl border border-border/40 bg-background/30 divide-y divide-border/40 text-left">
        {[
          { label: "Transaction Ref", value: txnRef, mono: true },
          { label: "Date", value: `${now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` },
        ].map(({ label, value, mono }) => (
          <div key={label} className="flex justify-between px-3 py-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={`${mono ? "font-mono text-primary" : "text-white"}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground/60">Demo — no real purchase or charge was made.</div>

      <Button className="w-full bg-primary font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(168,85,247,0.25)]" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

function CheckoutModal({ item, onClose }: { item: typeof GAME_KEYS[0]; onClose: () => void }) {
  const [step, setStep] = useState<ModalStep>("method");
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");
  const [purchasedCardName, setPurchasedCardName] = useState("");

  const simulatePurchase = (method: PayMethod, name = "") => {
    setPayMethod(method);
    setPurchasedCardName(name);
    setStep("processing");
    setTimeout(() => setStep("done"), method === "upi" ? 1800 : 2200);
  };

  const getTitle = () => {
    if (step === "method") return "Choose Payment";
    if (step === "upi") return "Pay via UPI";
    if (step === "visa") return "Visa Debit Card";
    if (step === "processing") return "Processing…";
    return "Purchase Complete!";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl my-4 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f0a24 0%, #08080f 100%)", border: "1px solid rgba(168,85,247,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            {(step === "upi" || step === "visa") && (
              <button onClick={() => setStep("method")} className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-white transition-colors mr-1">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              {step === "done" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <ShoppingCart className="h-4 w-4 text-primary" />}
            </div>
            <span className="font-bold text-white text-sm">{getTitle()}</span>
          </div>
          {step !== "processing" && (
            <button onClick={onClose} className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Item summary (not on done/processing) */}
        {step !== "done" && step !== "processing" && (
          <div className="px-5 pt-4">
            <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground">{item.platform}</div>
                </div>
              </div>
              <div className="text-xl font-black text-white shrink-0">${item.price.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {step === "processing" && <ShopProcessing method={payMethod} />}

          {step === "done" && (
            <ShopSuccess item={item} payMethod={payMethod} cardName={purchasedCardName} onClose={onClose} />
          )}

          {step === "method" && (
            <div className="space-y-3 mt-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Select payment method</div>

              {([
                { id: "upi" as PayMethod, icon: <Smartphone className="h-5 w-5 text-primary" />, label: "UPI", sub: "GPay · PhonePe · Paytm · BHIM", badge: "India" },
                { id: "visa" as PayMethod, icon: <CreditCard className="h-5 w-5 text-primary" />, label: "Visa Debit Card", sub: "All Visa debit & credit cards", badge: null },
              ]).map((m) => (
                <button key={m.id} onClick={() => setStep(m.id)}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border/60 bg-background/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                  <div className="h-11 w-11 rounded-xl bg-primary/20 border border-primary/25 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.25)] transition-all">
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {m.label}
                      {m.badge && <span className="text-[9px] bg-green-500/20 border border-green-500/30 text-green-400 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wider">{m.badge}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</div>
                  </div>
                  <div className="text-primary font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                </button>
              ))}

              {/* Trust row */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {[
                  { icon: <Lock className="h-3 w-3 text-green-400" />, label: "SSL" },
                  { icon: <ShieldCheck className="h-3 w-3 text-blue-400" />, label: "PCI" },
                  { icon: <BadgeCheck className="h-3 w-3 text-primary" />, label: "Verified" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-1 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                    {b.icon}{b.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "upi" && (
            <div className="mt-1">
              <UPIShopPanel price={item.price} onPay={() => simulatePurchase("upi")} />
            </div>
          )}

          {step === "visa" && (
            <div className="mt-1">
              <VisaShopPanel price={item.price} onPay={(name) => simulatePurchase("visa", name)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<typeof GAME_KEYS[0] | null>(null);

  return (
    <>
      {selected && <CheckoutModal item={selected} onClose={() => setSelected(null)} />}

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            <Key className="h-8 w-8 text-primary" />
            Game Key Shop
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Unlock content for your favourite games. Instant delivery via digital key.
            <span className="ml-2 text-xs text-primary/60 font-semibold">[Demo — mock payment only]</span>
          </p>
        </div>

        {!user && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90 flex items-center gap-3">
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            Log in to purchase game keys.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAME_KEYS.map((item) => (
            <Card key={item.id} className="border-border bg-card/50 hover:border-primary/40 transition-all group overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{item.icon}</span>
                  {item.tag && (
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-white text-sm leading-tight">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</div>
                  <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" />{item.platform}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-2xl font-black text-white">${item.price.toFixed(2)}</div>
                  <button
                    className="flex items-center gap-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white font-bold uppercase text-xs px-3 py-2 transition-all"
                    onClick={() => user ? setSelected(item) : window.location.assign("/login")}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Buy Key
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
