import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Minimize2, Sparkles } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

/* ── AI RESPONSE ENGINE ─────────────────────────────────────── */
const RESPONSES: Array<{ patterns: RegExp; reply: string }> = [
  {
    patterns: /post|request|hire|mission|create.*request|how.*post/i,
    reply: `To post a gaming request:\n\n1. **Log in** and go to your Dashboard\n2. Click **"Post Request"**\n3. Fill in your game name, platform, skill level, and objectives\n4. Submit — gamers will start bidding right away!\n\nTip: Be specific about what you need (e.g. "carry me to Diamond in Apex Legends") to attract the best bids. 🎮`,
  },
  {
    patterns: /bid|apply|get hired|become|earn|gamer.*buddy|hired/i,
    reply: `To bid on requests and get hired:\n\n1. Go to **Browse Requests** and find sessions you can help with\n2. Click **"Place Bid"** and enter your price + a pitch message\n3. If accepted, you'll get a Discord username to coordinate\n4. Complete the session honestly and earn your payment!\n\n💡 You earn **90%** of your bid price — we take a 10% platform fee. Lowest competitive bids tend to win, but a great pitch matters too!`,
  },
  {
    patterns: /wallet|payment|deposit|withdraw|add.*fund|money|pay/i,
    reply: `Gamerbuddy has **two separate wallets**:\n\n🔵 **Hiring Wallet** — deposit money here to pay gamers\n• Min deposit: $10.75 | Max: $1,000\n• Payment via UPI, Visa, Mastercard, PayPal & more\n\n🟢 **Earnings Wallet** — gamers receive payments here\n• Withdrawals available when balance ≥ $100\n\nWhen a bid is accepted, funds are held in **escrow** until the session is complete — protecting both parties. 🛡️`,
  },
  {
    patterns: /password|account.*shar|login.*shar|never.*share|safe|security|scam|fraud/i,
    reply: `🔒 **Critical Safety Rule:**\n\nGamerbuddy gamers will **NEVER** ask for your account password. This applies to:\n• Steam, Epic Games, PlayStation, Xbox, Nintendo, or any other platform\n\n⛔ If anyone asks for your password or login details, **report them immediately** using the Flag button.\n\nAll payments are handled securely through our platform. Never pay or receive money outside Gamerbuddy — it removes your protection.`,
  },
  {
    patterns: /review|rating|stars?|feedback|rate/i,
    reply: `After every session, both the hirer and the gamer must leave a **review** (1–10 stars + comment).\n\n⭐ Reviews are mandatory — they unlock your **50 point reward** for each completed session!\n\n• Minimum comment: 10 characters\n• Rating range: 1–10\n• Reviews build your Trust Factor and attract better sessions`,
  },
  {
    patterns: /point|pts|rank|shop|badge|title|reward/i,
    reply: `**Gamerbuddy Points** are your in-app currency! 🏆\n\nEarn points by:\n• Completing sessions (+50 pts each)\n• Receiving good reviews\n• Levelling up your rank\n\nSpend points in the **Points Shop** on:\n• Profile backgrounds (colour themes)\n• Custom titles shown on your profile\n\nHigher ranks unlock perks and more visibility to hirers!`,
  },
  {
    patterns: /discord|voice.*chat|voip|mic|voice/i,
    reply: `Voice chat on Gamerbuddy:\n\n🎙️ Each accepted session includes a **Jitsi Meet** voice room link — no downloads needed, works in your browser.\n\nRemember: **Always ask the hirer** if they want voice chat before joining. Some players prefer text-only. Respecting their preference is part of the Gamer Code of Conduct.`,
  },
  {
    patterns: /session|start|progress|complete|approv|finish|end.*session/i,
    reply: `Here's the **session flow**:\n\n1. Hirer posts a request → Gamers bid\n2. Hirer accepts a bid + shares Discord username\n3. Gamer clicks **"Start Session"**\n4. Hirer **approves** the session start\n5. Session moves to **In Progress** 🎮\n6. After playing, both parties leave a review\n7. Payment releases to the gamer's Earnings Wallet ✅\n\nFunds are held in escrow throughout — fully protected!`,
  },
  {
    patterns: /report|flag|toxic|ban|suspended|abuse/i,
    reply: `To report a user:\n\n1. Click the **🚩 Flag** icon next to any username (in Browse or on their profile)\n2. Choose the reason (fraud, toxicity, fake profile, etc.)\n3. Add any extra details and submit\n\nOur safety team reviews all reports. Confirmed violations result in account suspension and loss of earnings. Your report is confidential.`,
  },
  {
    patterns: /verif|badge|trust|id|official|how long|7.*day|15.*day/i,
    reply: `**Verification & Verified Badge** ✅\n\nOnce you create an account, our team carefully reviews your ID and phone number to keep the community safe.\n\n⏱️ **Timeline: 7–15 days** after submitting your details\n\nWhile waiting:\n• You can **browse requests** freely\n• You can **place bids** on sessions\n• Posting your own requests and hiring gamers unlock **after verification**\n\nOnce verified, you'll receive the green ✅ badge on your profile, bids, and listings — trusted by more hirers and winning more sessions!`,
  },
  {
    patterns: /hello|hi|hey|help|support|what.*can.*you|who.*are.*you/i,
    reply: `Hey there! 👋 I'm **Buddy**, your Gamerbuddy AI assistant!\n\nI can help you with:\n• 📋 How to post a request\n• 🎮 How to bid and get hired\n• 💰 Wallet & payment questions\n• 🔒 Safety rules and reporting\n• ⭐ Reviews, points & rewards\n• 🎙️ Voice chat & sessions\n\nWhat can I help you with today?`,
  },
  {
    patterns: /quest|portfolio|showcase/i,
    reply: `**My Quest** is your gamer portfolio! 🎯\n\nAdd up to **10 entries** showing:\n• Game you play\n• How you help (e.g. "carry to Gold")\n• Your playstyle (e.g. "chill, patient coach")\n\nA strong Quest profile helps hirers understand exactly what you offer, leading to more accepted bids. Edit it from your Profile page.`,
  },
  {
    patterns: /tip|gift|bonus|extra.*pay/i,
    reply: `**Tips & Gifts** 🎁\n\nHirers can send a bonus tip to a gamer after a great session! Look for the tip option in your Dashboard after a completed session.\n\nTips go directly to the gamer's Earnings Wallet. It's a great way to show appreciation for an exceptional gaming experience!`,
  },
];

const FALLBACK_RESPONSES = [
  "I'm not sure I fully understand — could you rephrase that? I can help with posting requests, bidding, wallets, safety, reviews, and more! 🎮",
  "Hmm, let me think… I'm best at answering questions about how Gamerbuddy works. Try asking about bidding, wallets, sessions, or safety rules!",
  "I don't have a specific answer for that, but our support team is here to help! For now, I can assist with: posting requests, bidding, payments, reviews, and safety. What would you like to know?",
];

let fallbackIndex = 0;

function getAIReply(input: string): string {
  const trimmed = input.trim();
  for (const { patterns, reply } of RESPONSES) {
    if (patterns.test(trimmed)) return reply;
  }
  const resp = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
  fallbackIndex++;
  return resp;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const boldProcessed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: boldProcessed }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

const QUICK_PROMPTS = [
  "How do I post a request?",
  "How do I get hired?",
  "Wallet & payment help",
  "How long does verification take?",
];

let msgIdCounter = 1;

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hey! 👋 I'm **Buddy**, your Gamerbuddy AI assistant. Ask me anything about posting requests, bidding, wallets, safety, or sessions!",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = { id: msgIdCounter++, role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(
      () => {
        const reply = getAIReply(text.trim());
        setMessages((m) => [...m, { id: msgIdCounter++, role: "assistant", text: reply }]);
        setTyping(false);
      },
      600 + Math.random() * 400,
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[150] flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-2xl font-bold text-sm text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#6d28d9]" />
          </div>
          <span>AI Support</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-[150] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: "min(380px, calc(100vw - 24px))",
            height: minimized ? "auto" : "min(520px, calc(100vh - 80px))",
            background: "hsl(var(--card))",
            border: "1px solid rgba(124,58,237,0.3)",
            boxShadow: "0 0 60px rgba(124,58,237,0.15), 0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Window header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(109,40,217,0.15) 100%)",
              borderBottom: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  boxShadow: "0 0 12px rgba(124,58,237,0.4)",
                }}
              >
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  Buddy
                  <Sparkles className="h-3 w-3 text-purple-300" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span className="text-[10px] text-green-400 font-medium">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((p) => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === "assistant"
                          ? "bg-purple-600/30 border border-purple-500/30"
                          : "bg-cyan-500/20 border border-cyan-500/25"
                      }`}
                    >
                      {msg.role === "assistant"
                        ? <Bot className="h-3.5 w-3.5 text-purple-300" />
                        : <User className="h-3.5 w-3.5 text-cyan-300" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "assistant"
                          ? "rounded-tl-sm bg-background/80 border border-border/40 text-foreground/90"
                          : "rounded-tr-sm text-white"
                      }`}
                      style={
                        msg.role === "user"
                          ? {
                              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                              boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                            }
                          : undefined
                      }
                    >
                      {renderMarkdown(msg.text)}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-purple-600/30 border border-purple-500/30">
                      <Bot className="h-3.5 w-3.5 text-purple-300" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-background/80 border border-border/40 px-4 py-3 flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                          style={{
                            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick prompts (show only at start) */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-purple-500/25 bg-purple-500/8 text-purple-300 hover:bg-purple-500/15 hover:text-white transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="px-4 pb-4 pt-2 flex gap-2 shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything…"
                  maxLength={300}
                  className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm bg-background/60 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 hover:brightness-110 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    boxShadow: input.trim() ? "0 2px 12px rgba(124,58,237,0.35)" : undefined,
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
