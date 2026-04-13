import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart, Key, Zap, X, CheckCircle2, Lock,
  CreditCard, Smartphone, Copy, Clock, Wifi, ChevronLeft,
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

const TEST_CARDS = [
  { number: "4111 1111 1111 1111", label: "Visa (success)" },
  { number: "4000 0000 0000 9995", label: "Decline test" },
];

function UPIQRGrid() {
  const cells = React.useMemo(() =>
    Array.from({ length: 64 }).map(() => Math.random() > 0.55), []);
  return (
    <div className="w-40 h-40 rounded-xl border-2 border-primary/40 relative overflow-hidden flex items-center justify-center"
      style={{ boxShadow: "0 0 20px rgba(168,85,247,0.2)" }}>
      <div className="absolute inset-0 grid grid-cols-8 gap-0">
        {cells.map((filled, i) => (
          <div key={i} className="border border-primary/5"
            style={{ background: filled ? "rgba(168,85,247,0.8)" : "transparent" }} />
        ))}
      </div>
      <div className="relative z-10 w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center">
        <Key className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}

function ProcessingSpinner({ method }: { method: PayMethod }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="py-8 flex flex-col items-center gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
        {method === "upi"
          ? <Smartphone className="absolute inset-0 m-auto h-7 w-7 text-primary" />
          : <CreditCard className="absolute inset-0 m-auto h-7 w-7 text-primary" />}
      </div>
      <div className="text-center">
        <div className="font-bold text-white">
          {method === "upi" ? "Verifying UPI" : "Processing Card"}{dots}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
          <Wifi className="h-3 w-3" /> Secure encrypted connection
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> This may take a few seconds
      </div>
    </div>
  );
}

function CheckoutModal({ item, onClose }: { item: typeof GAME_KEYS[0]; onClose: () => void }) {
  const [step, setStep] = useState<ModalStep>("method");
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");

  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("12/27");
  const [cvv, setCvv] = useState("123");
  const { toast } = useToast();

  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const fakeKey = React.useMemo(() =>
    `GB-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, []);

  const simulatePurchase = (method: PayMethod) => {
    setPayMethod(method);
    setStep("processing");
    setTimeout(() => setStep("done"), method === "upi" ? 1800 : 2200);
  };

  const handleUPIPay = () => simulatePurchase("upi");

  const handleCardPay = () => {
    if (!cardName.trim()) {
      toast({ title: "Missing Info", description: "Enter the cardholder name.", variant: "destructive" });
      return;
    }
    simulatePurchase("visa");
  };

  if (step === "done") {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-center">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-400" />
          <div>
            <div className="text-xl font-extrabold uppercase text-white">Purchase Complete!</div>
            <div className="text-sm text-muted-foreground mt-1">{item.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              paid via {payMethod === "upi" ? `UPI · ${UPI_ID}` : `Visa ···· ${cardNumber.replace(/\s/g, "").slice(-4)}`}
            </div>
          </div>
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Your Game Key</div>
            <div className="font-mono text-lg font-black text-secondary tracking-widest">{fakeKey}</div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(fakeKey); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-secondary transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Key
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Redeem on {item.platform}. Single-use only.</p>
          </div>
          <p className="text-xs text-muted-foreground">Demo — no real purchase or charge was made.</p>
          <Button className="w-full bg-primary font-bold uppercase" onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <ProcessingSpinner method={payMethod} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            {(step === "upi" || step === "visa") && (
              <button onClick={() => setStep("method")} className="text-muted-foreground hover:text-white mr-1">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-bold text-white">
              {step === "method" ? "Choose Payment" : step === "upi" ? "Pay via UPI" : "Visa Debit Card"}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Item summary */}
          <div className="rounded-xl border border-border bg-background/50 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="min-w-0">
                <div className="font-bold text-white text-sm truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.platform}</div>
              </div>
            </div>
            <div className="text-xl font-black text-white shrink-0">${item.price.toFixed(2)}</div>
          </div>

          {/* Method selection */}
          {step === "method" && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Select payment method</div>
              <button
                onClick={() => setStep("upi")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.3)] transition-all">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">UPI</div>
                  <div className="text-xs text-muted-foreground mt-0.5">GPay · PhonePe · Paytm · BHIM</div>
                </div>
                <div className="text-xs text-primary font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </div>
              </button>

              <button
                onClick={() => setStep("visa")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.3)] transition-all">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">Visa Debit Card</div>
                  <div className="text-xs text-muted-foreground mt-0.5">All Visa debit and credit cards</div>
                </div>
                <div className="text-xs text-primary font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </div>
              </button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span>Mock demo — no real payment will be processed.</span>
              </div>
            </div>
          )}

          {/* UPI panel */}
          {step === "upi" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <UPIQRGrid />
                <div className="text-center space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">Scan with any UPI app</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{UPI_ID}</span>
                    <button onClick={() => navigator.clipboard.writeText(UPI_ID)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">Amount: <strong className="text-white">${item.price.toFixed(2)}</strong></div>
                </div>
                <div className="w-full bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <span className="text-xs text-green-400 font-medium">Waiting for payment confirmation</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/60 rounded-lg border border-border px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
                Mock demo — click below to simulate a successful UPI payment.
              </div>
              <Button className="w-full bg-primary font-bold uppercase py-5" onClick={handleUPIPay}>
                <Smartphone className="h-4 w-4 mr-2" />
                I've Paid via UPI · ${item.price.toFixed(2)}
              </Button>
            </div>
          )}

          {/* Visa card panel */}
          {step === "visa" && (
            <div className="space-y-4">
              {/* Live card preview */}
              <div
                className="relative rounded-xl overflow-hidden p-4 text-white"
                style={{ background: "linear-gradient(135deg, #2d1b69 0%, #11082a 60%, #0a1a2e 100%)" }}
              >
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.04) 10px, rgba(255,255,255,.04) 20px)" }} />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-purple-300 font-bold">Game Key Shop</div>
                    <div className="font-bold text-purple-200 text-lg italic tracking-widest">VISA</div>
                  </div>
                  <div className="font-mono text-base tracking-widest mb-4 text-white/90">
                    {formatCard(cardNumber.replace(/\s/g, "")) || "•••• •••• •••• ••••"}
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <div className="text-purple-300 uppercase tracking-wider">Holder</div>
                      <div className="font-semibold">{cardName || "YOUR NAME"}</div>
                    </div>
                    <div>
                      <div className="text-purple-300 uppercase tracking-wider">Expires</div>
                      <div className="font-semibold">{expiry || "MM/YY"}</div>
                    </div>
                    <div className="bg-white/20 rounded px-2.5 py-1">
                      <div className="text-xs font-black">${item.price.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Demo cards hint */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Demo Test Cards</div>
                  {TEST_CARDS.map((tc) => (
                    <button key={tc.number} onClick={() => setCardNumber(tc.number)}
                      className="w-full text-left flex items-center justify-between text-xs py-0.5 hover:text-amber-400 transition-colors">
                      <span className="font-mono text-white">{tc.number}</span>
                      <span className="text-muted-foreground">{tc.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Card Number</Label>
                  <Input value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    className="bg-background font-mono tracking-wider" maxLength={19} placeholder="1234 5678 9012 3456" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Cardholder Name</Label>
                  <Input value={cardName} onChange={(e) => setCardName(e.target.value)}
                    className="bg-background" placeholder="John Doe" autoComplete="cc-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Expiry</Label>
                    <Input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className="bg-background font-mono" maxLength={5} placeholder="MM/YY" autoComplete="cc-exp" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">CVV</Label>
                    <Input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="bg-background font-mono" maxLength={4} type="password" placeholder="•••" autoComplete="cc-csc" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-green-500 shrink-0" />
                256-bit SSL encrypted. Mock demo — no real card charged.
              </div>
              <Button className="w-full bg-primary font-bold uppercase py-5" onClick={handleCardPay}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${item.price.toFixed(2)} · Visa Debit
              </Button>
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
            <span className="ml-2 text-xs text-primary/70 font-semibold">[Demo — mock payment, no real charges]</span>
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
                  <Button
                    size="sm"
                    className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white font-bold uppercase text-xs"
                    onClick={() => user ? setSelected(item) : window.location.assign("/login")}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                    Buy Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
