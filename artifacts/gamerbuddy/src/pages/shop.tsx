import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Key, Zap, X, CheckCircle2, Lock } from "lucide-react";

const GAME_KEYS = [
  {
    id: 1,
    title: "Apex Legends — Champion Bundle",
    description: "Unlock 3 exclusive legends skins + 2000 Apex Coins.",
    platform: "PC / EA App",
    price: 19.99,
    tag: "Popular",
    tagColor: "border-primary/40 text-primary bg-primary/10",
    icon: "⚡",
  },
  {
    id: 2,
    title: "Valorant — Night Market Pack",
    description: "5 weapon skins from the exclusive Night Market vault.",
    platform: "PC / Riot",
    price: 29.99,
    tag: "Exclusive",
    tagColor: "border-secondary/40 text-secondary bg-secondary/10",
    icon: "🔫",
  },
  {
    id: 3,
    title: "Call of Duty — Season Pass",
    description: "Unlock the full Battle Pass + 20 tier skips.",
    platform: "PC / Xbox / PS",
    price: 14.99,
    tag: "Best Value",
    tagColor: "border-green-500/40 text-green-400 bg-green-500/10",
    icon: "🎖️",
  },
  {
    id: 4,
    title: "Fortnite — 2800 V-Bucks",
    description: "Top up your V-Bucks and unlock this season's battle pass.",
    platform: "All Platforms",
    price: 19.99,
    tag: "Hot",
    tagColor: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    icon: "⭐",
  },
  {
    id: 5,
    title: "Minecraft — Java + Bedrock Bundle",
    description: "Full access to both versions of Minecraft.",
    platform: "PC",
    price: 26.99,
    tag: null,
    tagColor: "",
    icon: "⛏️",
  },
  {
    id: 6,
    title: "League of Legends — RP Pack (10,000)",
    description: "10,000 Riot Points to spend on champions and skins.",
    platform: "PC / Riot",
    price: 49.99,
    tag: "Mega Pack",
    tagColor: "border-pink-500/40 text-pink-400 bg-pink-500/10",
    icon: "👑",
  },
];

function CheckoutModal({ item, onClose }: { item: typeof GAME_KEYS[0]; onClose: () => void }) {
  const [step, setStep] = useState<"confirm" | "done">("confirm");
  const { toast } = useToast();

  const handleBuy = () => {
    setTimeout(() => setStep("done"), 900);
  };

  if (step === "done") {
    const fakeKey = `GB-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-400" />
          <div className="text-xl font-extrabold uppercase text-white">Purchase Complete!</div>
          <p className="text-sm text-muted-foreground">{item.title}</p>
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold">Your Game Key</div>
            <div className="font-mono text-lg font-black text-secondary tracking-widest">{fakeKey}</div>
            <p className="text-xs text-muted-foreground mt-2">Copy and redeem on {item.platform}. Keys are single-use.</p>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a demo — no real purchase was made. Real payments will be processed via Stripe.
          </p>
          <Button className="w-full bg-primary font-bold uppercase" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Confirm Purchase
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
          <div className="text-xl">{item.icon}</div>
          <div className="font-bold text-white">{item.title}</div>
          <div className="text-sm text-muted-foreground">{item.description}</div>
          <div className="text-xs text-muted-foreground">{item.platform}</div>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-muted-foreground text-sm">Total</span>
          <span className="text-2xl font-black text-white">${item.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg border border-border px-3 py-2">
          <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
          Payments are demo only. No real charges will be made.
        </div>
        <Button
          className="w-full bg-primary font-bold uppercase py-5 text-base"
          onClick={handleBuy}
        >
          <Key className="h-5 w-5 mr-2" />
          Buy Now · ${item.price.toFixed(2)}
        </Button>
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
            <span className="ml-2 text-xs text-primary font-semibold">[Demo — no real charges]</span>
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
                    <Zap className="h-3 w-3 text-primary" />
                    {item.platform}
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
