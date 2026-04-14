import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Minimize2, Sparkles } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

/* ── KNOWLEDGE BASE ──────────────────────────────────────────
   Patterns are checked in order — more specific first.
   Each entry covers one topic area.
───────────────────────────────────────────────────────────── */
const RESPONSES: Array<{ patterns: RegExp; reply: string }> = [

  /* ── GREETING / INTRO ── */
  {
    patterns: /^(hello|hi+|hey|yo|sup|howdy)\b|what can you (do|help)|who are you|what are you/i,
    reply: `Hey there! 👋 I'm **Buddy**, your Gamerbuddy AI assistant — always online to help!

Here's what I can answer:
• 📋 Posting requests & bidding
• 💰 Wallets, payments & escrow
• 🏆 Tournaments & Bulk Hiring
• ⭐ Points, rewards & profile shop
• 🔴 Streaming connections
• 🌍 Nation & gender filters
• 🔒 Safety rules & reporting
• 💬 Community & suggestions

What would you like to know?`,
  },

  /* ── POST / CREATE REQUEST ── */
  {
    patterns: /post|create.*request|new.*request|how.*request|hire.*someone|find.*gamer/i,
    reply: `To post a gaming request:\n\n1. **Log in** → go to your Dashboard\n2. Click **"Post Request"**\n3. Enter your game, platform, skill level, and — importantly — a **Clear Objective** (e.g. "Carry me to Diamond in Apex Legends")\n4. Optionally set your **Preferred Nation** and **Preferred Gender** for a better match\n5. Submit — gamers will start bidding right away! 🎮\n\n💡 Specific, well-written objectives attract the best bids. The more detail you give, the better your results.`,
  },

  /* ── BIDDING / GETTING HIRED ── */
  {
    patterns: /bid|apply.*request|get hired|become.*gamer|earn.*money|hired|place.*bid/i,
    reply: `To bid on a request and get hired:\n\n1. Browse open requests on the **Browse Requests** page\n2. Click **"Place Bid"** — enter your price and a pitch message\n3. If the hirer accepts, you'll connect and coordinate the session\n4. Complete the session, both parties leave a review\n5. Payment releases to your **Earnings Wallet** ✅\n\n💡 You keep **90%** of your bid — Gamerbuddy charges a 10% platform fee. Competitive bids + a strong pitch win sessions!`,
  },

  /* ── BULK HIRING ── */
  {
    patterns: /bulk|multiple.*gamer|hire.*team|squad|group.*hire/i,
    reply: `**Bulk Hiring** lets you recruit a full squad in one request! 🎯\n\n• Minimum: **2 gamers**\n• Maximum: **100 gamers**\n• Each gamer submits their own individual bid\n• The hirer reviews and approves each slot separately\n• Each accepted gamer gets their own session and payment\n\nPerfect for tournament prep, raid teams, or any scenario where you need multiple skilled players at once.`,
  },

  /* ── TOURNAMENTS ── */
  {
    patterns: /tournament|host.*tourney|prize.*pool|compete|championship/i,
    reply: `**Tournaments on Gamerbuddy** 🏆\n\nAnyone can host a tournament:\n• **Min players:** 2 &nbsp;|&nbsp; **Max players:** 100\n• **Prize pool:** $100 – $10,000\n• **Entry:** Free for participants\n• **Platform fee:** 10% of the prize pool\n\nHow it works:\n1. Hirer creates a tournament with game, rules, prize & schedule\n2. Players apply to join\n3. **Hirer approves participants** before it begins\n4. Winner is confirmed and prize is paid out via the platform\n\nYou can also set **Nation** or **Gender** preferences for your tournament!`,
  },

  /* ── WALLETS ── */
  {
    patterns: /wallet|deposit|withdraw|add.*fund|fund|money|pay(?:ment)?|transfer|balance/i,
    reply: `Gamerbuddy has **two separate wallets**:\n\n🔵 **Hiring Wallet** — top this up to pay gamers\n• Min deposit: $10.75 &nbsp;|&nbsp; Max: $1,000\n• Accepts Razorpay, Stripe (Visa, Mastercard, UPI, etc.)\n\n🟢 **Earnings Wallet** — receives your gamer payments\n• Withdrawals available when balance ≥ $100\n\nWhen a bid is accepted, funds move to **escrow** immediately — protecting both parties until the session is complete. 🛡️`,
  },

  /* ── PLATFORM FEE ── */
  {
    patterns: /fee|commission|percent|10%|platform.*cut|how much.*charge/i,
    reply: `**Platform Fee:**\n\nGamerbuddy charges a **10% fee** on every completed session and tournament.\n\n• If a gamer bids **$10**, the hirer pays $10 and the gamer receives **$9**\n• For tournaments, 10% is deducted from the prize pool\n\nThis fee covers payment processing, escrow protection, dispute handling, and platform maintenance. It is non-negotiable and applies to all transactions.`,
  },

  /* ── ESCROW ── */
  {
    patterns: /escrow|refund|cancel|dispute|held|protect/i,
    reply: `**Escrow Protection** 🛡️\n\nWhen a hirer accepts a bid, funds are immediately locked in **escrow** — neither party can access them until the session concludes.\n\n• If the session completes successfully → payment releases to the gamer\n• If there's a dispute → our team reviews and resolves it\n• Cancellations before a session starts → funds return to the Hiring Wallet\n\nThis protects both hirers and gamers from fraud.`,
  },

  /* ── SESSION FLOW ── */
  {
    patterns: /session|start.*play|how.*work|flow|process|what happen|in.*progress|approv.*session/i,
    reply: `**Session Flow** step by step:\n\n1. Hirer posts a request with clear objectives\n2. Gamers browse and place bids\n3. Hirer accepts the best bid\n4. Gamer clicks **"Start Session"**\n5. Hirer **approves** the session start\n6. Status moves to **In Progress** 🎮\n7. Both play and complete the objectives\n8. Both leave a **review** (mandatory to unlock payment + points)\n9. Payment releases to gamer's Earnings Wallet ✅`,
  },

  /* ── POINTS & REWARDS ── */
  {
    patterns: /point|pts|reward|rank|level|title|badge.*earn|how.*earn.*point/i,
    reply: `**Gamerbuddy Points System** 🏆\n\nYou earn **50 points** for every session you complete + receive a review.\n\nPoints increase your **Rank** — higher ranks get more visibility in search results and attract better hirers.\n\nSpend points in the **Points Shop** on:\n• Profile backgrounds & colour themes\n• Custom titles displayed on your profile card\n• Cosmetic badges (Steam-style customisation)\n\nCheck your points balance and rank on your **Profile page**.`,
  },

  /* ── PROFILE SHOP / CUSTOMISATION ── */
  {
    patterns: /shop|profile.*custom|background|theme.*profile|cosmetic|steam.*style|personaliz/i,
    reply: `**Profile Customisation (Steam-style)** 🎨\n\nSpend your earned points in the **Points Shop** to personalise your profile:\n\n• 🎨 **Profile backgrounds** — unique colour themes\n• 🏷️ **Custom titles** — shown under your username (e.g. "Elite Carry", "Chill Coach")\n• 🏅 **Cosmetic badges** — display your achievements\n\nCustomised profiles stand out to hirers and make your gaming identity pop. Access the shop from your **Profile page → Points section**.`,
  },

  /* ── QUEST / PORTFOLIO ── */
  {
    patterns: /quest|portfolio|showcase|what.*i.*offer|my.*skill|gamer.*portfolio/i,
    reply: `**My Quest** is your gamer showcase! 🎯\n\nAdd up to **10 entries**, each showing:\n• The **game** you play\n• **How you help** (e.g. "Carry to Platinum", "Raid leader", "Coach beginners")\n• Your **playstyle** (e.g. "patient, chill, mic optional")\n\nA detailed Quest section makes hirers confident in accepting your bids — it's the difference between being ignored and getting hired instantly. Edit it from your **Profile page**.`,
  },

  /* ── STREAMING CONNECTIONS ── */
  {
    patterns: /stream|twitch|youtube.*gaming|kick|facebook.*gaming|tiktok.*live|connect.*account|linked.*account/i,
    reply: `**Streaming Platform Connections** 🔴\n\nLink your streaming accounts directly to your Gamerbuddy profile:\n\n• 📺 Twitch\n• 🎮 YouTube Gaming\n• 🟩 Kick\n• 📘 Facebook Gaming\n• 🎵 TikTok Live\n\nConnected accounts appear on your profile and show hirers that you stream. This boosts trust and can unlock the **"Has Streaming"** filter — hirers specifically searching for streamers will find you!`,
  },

  /* ── LIKE / DISLIKE ── */
  {
    patterns: /like|dislike|thumbs|vote.*profile|endorse|profile.*rating|upvote/i,
    reply: `**Profile Likes & Dislikes** 👍👎\n\nYou can like or dislike another user's profile **only if you've played a session together**.\n\n• One vote per profile (can change)\n• Votes contribute to that gamer's reputation score\n• You cannot vote on your own profile\n\nThis keeps reputation genuine — only real session partners can vouch for each other.`,
  },

  /* ── NATION / GENDER PREFERENCES ── */
  {
    patterns: /nation|country|region.*filter|gender|prefer.*country|prefer.*gender|filter.*gender|filter.*country/i,
    reply: `**Nation & Gender Preferences** 🌍\n\nWhen **posting a request**, you can set:\n• **Preferred Nation** — search and pick any country (or "Any / Worldwide")\n• **Preferred Gender** — Male, Female, Non-binary, or No preference\n\nWhen **browsing requests**, use the **MATCH** filter row to filter by nation and gender.\n\nWhen **creating or browsing Tournaments**, the same filters apply.\n\nThese are preferences only — gamers from any region can still bid; you choose who to accept.`,
  },

  /* ── REGIONAL CLOCK ── */
  {
    patterns: /clock|time.*zone|timezone|region.*time|world.*time|primary.*region|clock.*region/i,
    reply: `**Regional Clock** 🕒\n\nThe clock in the top navbar shows the current time for your **pinned primary region**.\n\nClick it to:\n• See live times for **9 gaming regions** — India, USA East, USA West, Europe, UK, Japan, South Korea, Brazil, Australia\n• **Tap any region** to set it as your primary display\n• Your local time is shown as a secondary reference when the primary differs\n\nYour region choice is saved automatically. Great for scheduling sessions with players across time zones!`,
  },

  /* ── COMMUNITY SUGGESTIONS ── */
  {
    patterns: /community|suggest|suggestion|feedback.*platform|feature.*request|upvote.*feature|comment.*suggest/i,
    reply: `**Community Suggestions** 💬\n\nHave an idea to improve Gamerbuddy? Head to the **Community** page!\n\n• Submit feature suggestions\n• **Like or dislike** other suggestions\n• Reply with **threaded comments** for discussion\n• Admins can mark suggestions as approved or rejected\n\n⚠️ **External links are not allowed** in comments or suggestions to keep the community safe.\n\nPopular suggestions with lots of votes are reviewed by the Gamerbuddy team for implementation!`,
  },

  /* ── PROMOTED / SPOTLIGHT GAMES ── */
  {
    patterns: /spotlight|promoted|featured.*game|bonus.*reward|special.*game|highlight/i,
    reply: `**Spotlight & Promoted Games** ✨\n\nCertain games are featured as **Promoted** or **Spotlight** on Gamerbuddy.\n\n• Sessions in promoted games earn **bonus rewards** on top of your regular 50 points\n• Promoted games appear highlighted in Browse and on the homepage\n• Check the Browse page regularly — spotlights rotate and give you a competitive edge!\n\nGreat time to jump in if your favourite game gets the spotlight treatment.`,
  },

  /* ── REVIEWS ── */
  {
    patterns: /review|rating|stars?|feedback|rate.*session|leave.*review/i,
    reply: `**Reviews** ⭐\n\nAfter every session, **both** the hirer and the gamer must leave a review:\n\n• Rating: **1–10 stars**\n• Written comment: minimum **10 characters**\n• Reviews are mandatory — they **unlock your 50 point reward** and release payment\n\nReviews build your **Trust Factor** and rank. Hirers heavily weigh recent reviews when choosing bids — consistent 9s and 10s put you at the top of the list.`,
  },

  /* ── TIP / GIFT ── */
  {
    patterns: /tip|gift|bonus.*pay|extra.*pay|send.*extra/i,
    reply: `**Tips & Gifts** 🎁\n\nAfter a session wraps up, hirers can send a **bonus tip** to a gamer as a thank-you for exceptional service.\n\n• Tips go directly to the gamer's **Earnings Wallet**\n• There's no platform fee on tips\n• Tips can be sent from the session summary in your **Dashboard**\n\nA great way to reward gamers who went above and beyond!`,
  },

  /* ── VOICE CHAT / JITSI ── */
  {
    patterns: /voice|discord|mic|jitsi|voice.*chat|voip|call|talking/i,
    reply: `**Voice Chat** 🎙️\n\nEach accepted session can include a **Jitsi Meet** link — browser-based, no download required.\n\n🔑 Important rule: **Always ask the hirer first** before joining a voice call. Some players prefer text-only communication.\n\nRespecting the hirer's preference is part of the **Gamer Code of Conduct** — violations can be reported.`,
  },

  /* ── RECORDING ── */
  {
    patterns: /record|stream.*session|capture|obs|clip/i,
    reply: `**Recording Sessions** 📹\n\nRecording a session is **entirely optional** and the responsibility of the person doing it.\n\n• Gamerbuddy does not record sessions on your behalf\n• If you plan to record or stream the session, **let the other party know** before starting\n• Consent and transparency are part of the platform's Code of Conduct`,
  },

  /* ── SAFETY / PASSWORDS ── */
  {
    patterns: /password|account.*shar|never.*share|security|scam|phish|login.*detail/i,
    reply: `🔒 **Critical Safety Rule:**\n\n**NEVER share your account password** — not for Steam, Epic Games, PlayStation, Xbox, Nintendo, or any other platform.\n\nLegitimate Gamerbuddy gamers will **never** ask for your login details. If someone asks:\n1. Refuse immediately\n2. Report them using the 🚩 **Flag button** on their profile or bid\n\nAll payments happen inside Gamerbuddy — never send money or gift cards outside the platform. Doing so removes all buyer protection.`,
  },

  /* ── YOU CANNOT HIRE YOURSELF ── */
  {
    patterns: /hire.*myself|bid.*own|self.*hire|own.*request/i,
    reply: `You **cannot hire yourself** on Gamerbuddy. 🚫\n\nThe platform prevents you from placing a bid on your own gaming request. This is a built-in safeguard to ensure fair competition and genuine transactions between different users.`,
  },

  /* ── REPORT / MODERATION ── */
  {
    patterns: /report|flag|toxic|ban|suspend|abuse|fake.*profile|fraud/i,
    reply: `**Reporting a User** 🚩\n\n1. Click the **Flag icon** next to any username — on Browse, on a bid, or on their profile\n2. Choose the reason: fraud, toxicity, fake profile, inappropriate content, etc.\n3. Add any extra context and submit\n\nOur moderation team reviews every report. Confirmed violations result in account suspension and forfeiture of pending earnings. Your report is confidential.`,
  },

  /* ── VERIFICATION / BADGE ── */
  {
    patterns: /verif|badge|trust.*factor|id.*check|how.*long.*verify|7.*day|15.*day|green.*tick/i,
    reply: `**Verification & Verified Badge** ✅\n\nVerification keeps Gamerbuddy safe and usually takes **7–15 days**.\n\nWhile unverified you can:\n• Browse all requests freely\n• Place bids on sessions\n\nOnce verified you unlock:\n• Posting your own requests\n• Hiring gamers\n• The green ✅ badge on your profile, bids, and listings\n\nVerified profiles win significantly more bids — hirers filter for them!`,
  },

  /* ── TRUST FACTOR ── */
  {
    patterns: /trust|trust.*factor|reputation|credib/i,
    reply: `**Trust Factor** 🛡️\n\nYour Trust Factor is a composite score built from:\n• Review ratings from completed sessions\n• Profile likes from past session partners\n• Verification status\n• Session completion rate\n• Account age and activity\n\nA high Trust Factor gives you better visibility in search, access to higher-value requests, and a competitive edge when hirers are comparing bids.`,
  },

  /* ── GENERAL HELP ── */
  {
    patterns: /help|support|question|how.*work|what.*is.*gamerbuddy|about.*platform/i,
    reply: `**Gamerbuddy** is a global gaming marketplace where you can hire skilled gamers for co-op, ranked sessions, raids, tournaments, and more — across PC, PlayStation, Xbox, Switch, Steam Deck, and mobile.\n\n🔑 Key things to know:\n• Post requests → receive bids → hire gamers\n• 10% platform fee on all completed sessions\n• Two wallets: Hiring (spend) & Earnings (receive)\n• Funds held in escrow for safety\n• Points earned per session → spend in Profile Shop\n\nAsk me about any specific feature!`,
  },
];

const FALLBACK_RESPONSES = [
  "I'm not sure I caught that — could you rephrase? I can help with posting requests, bidding, wallets, tournaments, bulk hiring, streaming, points, safety, and more! 🎮",
  "Hmm, I don't have a specific answer for that. Try asking about things like: how bidding works, wallet deposits, the 10% platform fee, tournament hosting, or verification.",
  "That one's tricky for me! For complex issues, our support team can help. Meanwhile I can assist with: sessions, wallets, points, bulk hiring, tournaments, community suggestions, and safety rules.",
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
    const processed = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.*?)`/g, "<code style='font-size:11px;background:rgba(168,85,247,0.15);padding:1px 4px;border-radius:4px'>$1</code>");
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: processed }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

const QUICK_PROMPTS = [
  "How do I post a request?",
  "How do I get hired?",
  "How does Bulk Hiring work?",
  "How does the points system work?",
  "Tell me about tournaments",
  "Wallet & payment help",
  "Is my account safe?",
  "How long does verification take?",
];

let msgIdCounter = 1;

export function AIChatWidget() {
  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hey! 👋 I'm **Buddy**, your Gamerbuddy AI assistant.\n\nI know everything about how the platform works — requests, bidding, wallets, tournaments, bulk hiring, streaming connections, points, safety rules, and more.\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput]   = useState("");
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
      500 + Math.random() * 500,
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating toggle */}
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
            width: "min(390px, calc(100vw - 20px))",
            height: minimized ? "auto" : "min(540px, calc(100vh - 80px))",
            background: "hsl(var(--card))",
            border: "1px solid rgba(124,58,237,0.3)",
            boxShadow: "0 0 60px rgba(124,58,237,0.15), 0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(109,40,217,0.15) 100%)",
              borderBottom: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  boxShadow: "0 0 14px rgba(124,58,237,0.5)",
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
                  <span className="text-[10px] text-green-400 font-medium">Online · Knows all platform features</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((p) => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Minimise"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Message thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
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
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
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

                {/* Typing dots */}
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
                          style={{ animation: `buddyBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick prompts — shown only at session start */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-purple-500/25 bg-purple-500/8 text-purple-300 hover:bg-purple-500/18 hover:text-white transition-colors"
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
                  placeholder="Ask me anything about Gamerbuddy…"
                  maxLength={300}
                  className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm bg-background/60 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 hover:brightness-110 active:scale-95 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    boxShadow: input.trim() ? "0 2px 12px rgba(124,58,237,0.4)" : undefined,
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
        @keyframes buddyBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
