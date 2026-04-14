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
    reply: `Yo! 👾 I'm **Buddy** — your in-game support homie, always online and always got your back!\n\nHit me up about anything:\n• 📋 Posting requests & bidding\n• 💰 Wallets, payments & escrow\n• 🏆 Tournaments & Bulk Hiring\n• ⭐ Points, ranks & profile shop\n• 🔴 Streaming connections\n• 🌍 Nation & gender filters\n• 🔒 Safety rules & who to report\n• 💬 Community suggestions\n\nLet's get you that W — what do you need? 🎮`,
  },

  /* ── POST / CREATE REQUEST ── */
  {
    patterns: /post|create.*request|new.*request|how.*request|hire.*someone|find.*gamer/i,
    reply: `Easy! Here's how to post a request and get skilled gamers knocking on your door 🎮\n\n1. Head to **Browse Requests** or your **Dashboard**\n2. Click **"Post Request"**\n3. Fill in:\n   • **Game** — what you're playing\n   • **Platform** — PC, PS5, Xbox, etc.\n   • **Skill Level** — beginner-friendly, intermediate, expert...\n   • **Objectives** — be specific! (e.g. "Carry me to Diamond in Apex Legends")\n4. Optionally set a **Preferred Nation** and **Preferred Gender** for a better match\n5. Hit submit — gamers will start bidding right away! 💥\n\n💡 **Pro tip:** Clear objectives = better bids. The more detail you put in, the better players you attract!`,
  },

  /* ── BIDDING / GETTING HIRED ── */
  {
    patterns: /bid|apply.*request|get hired|become.*gamer|earn.*money|hired|place.*bid/i,
    reply: `Love the hustle! 💰 Before you start placing bids, there's one thing you need first:\n\n🔒 **Verification is required to place bids.** It keeps the platform safe for everyone — and it's a one-time thing!\n\n**How to get verified (takes 7–15 days):**\n1. Go to your **Profile** page\n2. Complete **Email** confirmation\n3. Add and verify your **Phone number**\n4. Submit your **ID** for review\n5. Sit tight — our team will review and approve you 🎉\n\nOnce you're verified, here's how bidding works:\n1. Head to **Browse Requests** and find sessions you can dominate\n2. Click **"Place Bid"** — set your price and write a hype pitch about why you're the one\n3. Hirer accepts → you coordinate and play\n4. Finish the session, both drop a review\n5. Profit lands in your **Earnings Wallet** ✅\n\n💡 You keep **90%** of every bid — we take 10%. Verified badge + killer pitch = more W's. Let's go!`,
  },

  /* ── BULK HIRING ── */
  {
    patterns: /bulk|multiple.*gamer|hire.*team|squad|group.*hire/i,
    reply: `Need a full squad? **Bulk Hiring** is exactly what you need! 🎯\n\nHere's how it works:\n\n• Set the **number of slots** you want to fill (min **2**, max **100** gamers)\n• Write your **objectives** — same clear goals apply\n• Gamers bid for the slots individually\n• **You approve each participant** one by one — full control, no unwanted randos\n• Each accepted gamer gets their own session and payout\n\nPerfect for raid teams, tournament practice squads, or any time you need a whole crew. You pick who makes the cut! 🔥`,
  },

  /* ── TOURNAMENTS ── */
  {
    patterns: /tournament|host.*tourney|prize.*pool|compete|championship/i,
    reply: `Crown the champion! 🏆 Here's the full breakdown on **Gamerbuddy Tournaments**:\n\n• **Min players:** 2 &nbsp;|&nbsp; **Max players:** 100\n• **Prize pool:** $100 – $10,000\n• **Entry:** 100% free for participants\n• **Platform fee:** 10% of the prize pool (taken at payout)\n\nHow to host one:\n1. Go to **Tournaments** → create yours with game, rules, prize & schedule\n2. Players apply — joining is free\n3. **You approve every participant** before the tournament kicks off — no randos unless you say so\n4. Play it out, confirm the winner, prize pays out via the platform 🏅\n\nYou can also filter by **Nation** or **Gender** to make it a regional showdown!`,
  },

  /* ── WALLETS ── */
  {
    patterns: /wallet|deposit|withdraw|add.*fund|fund|money|pay(?:ment)?|transfer|balance/i,
    reply: `Gamerbuddy runs on **two separate wallets** — here's the breakdown 💸\n\n🔵 **Hiring Wallet** — load this up to pay your gamers\n• Min deposit: $10.75 &nbsp;|&nbsp; Max: $1,000\n• Pay via Razorpay or Stripe (Visa, Mastercard, UPI, and more)\n\n🟢 **Earnings Wallet** — this is where your gamer income lands\n• Withdraw once your balance hits **$100 or more**\n\nThe moment a bid is accepted, your funds lock into **escrow** — totally safe, can't be touched by either side until the session is done. 🛡️`,
  },

  /* ── PLATFORM FEE ── */
  {
    patterns: /fee|commission|percent|10%|platform.*cut|how much.*charge/i,
    reply: `Totally fair question! Here's how the fee works 💰\n\nWe take a **10% platform fee** on every completed Quest or Job — that's what keeps the platform running, payments protected, and support available.\n\n• **You pay the full bid amount** as the hirer\n• **90% goes directly to the gamer** 💸\n• The remaining 10% goes to Gamerbuddy\n\n**Example:** Gamer bids $20 → you pay $20 → gamer gets **$18** ✅\n\nNo hidden charges, no surprises — just a flat 10% every time a session completes. Same applies to tournament prize pools.`,
  },

  /* ── ESCROW ── */
  {
    patterns: /escrow|refund|cancel|dispute|held|protect/i,
    reply: `**Escrow Protection** 🛡️\n\nWhen a hirer accepts a bid, funds are immediately locked in **escrow** — neither party can access them until the session concludes.\n\n• If the session completes successfully → payment releases to the gamer\n• If there's a dispute → our team reviews and resolves it\n• Cancellations before a session starts → funds return to the Hiring Wallet\n\nThis protects both hirers and gamers from fraud.`,
  },

  /* ── SESSION FLOW ── */
  {
    patterns: /session|start.*play|how.*work|flow|process|what happen|in.*progress|approv.*session/i,
    reply: `Here's the full session run from start to finish 🎮\n\n1. Hirer drops a request with clear objectives\n2. Gamers roll in and place their bids\n3. Hirer picks the best bid — that's you 💪\n4. Gamer clicks **"Start Session"**\n5. Hirer **approves** the start — both sides locked in\n6. Status flips to **In Progress** 🔴\n7. Both of you play it out and complete the objectives\n8. Both drop a **review** — mandatory, this unlocks payment AND your 50 points\n9. Payment drops into the gamer's **Earnings Wallet** ✅\n\nEasy W. Repeat.`,
  },

  /* ── POINTS & REWARDS ── */
  {
    patterns: /point|pts|reward|rank|level|title|badge.*earn|how.*earn.*point/i,
    reply: `Gamerbuddy has its own XP system and it's 🔥\n\n**+50 points** every time you complete a session and get a review. Stack sessions, stack points.\n\nPoints level up your **Rank** — higher rank = better visibility = more hirers picking YOU over the competition.\n\nSpend points in the **Points Shop** (Steam-style) on:\n• 🎨 Profile backgrounds & colour themes\n• 🏷️ Custom titles (e.g. "Elite Carry", "Chill Coach")\n• 🏅 Cosmetic badges — flex your grind\n\nCheck your balance and rank on your **Profile page**. Let's level up! 💪`,
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

  /* ── ROADMAP / FUTURE FEATURES ── */
  {
    patterns: /roadmap|future.*feature|what.*coming|upcoming|phase|whats.*next|next.*update|coming.*soon|release|plan.*feature|feature.*plan/i,
    reply: `**Gamerbuddy Roadmap** 🗺️\n\nHere's what we're building — check the full **[Roadmap page](/roadmap)** for all the details!\n\n✅ **Phase 1 — Now Live**\n• Core hiring system (post, bid, accept, play, review)\n• Dual wallets with 10% platform fee\n• Account verification (7–15 days)\n\n🔜 **Phase 2 — Coming Soon**\n• Improved Browse layout\n• Community Suggestions with emojis & GIFs\n• Light/Dark theme toggle\n• Regional clock with selectable timezones\n\n🔵 **Phase 3 — Next**\n• Bulk Hiring (2–100 gamers)\n• Tournaments (hirer approves participants)\n• Quest system & Promoted Games with bonus rewards\n\n🚀 **Phase 4 — Future**\n• Advanced AI Support with quick replies\n• Full social features & streaming integrations\n• Stronger security & admin tools\n• More features based on your feedback!\n\nWant to shape what gets built? Head to **[Community Suggestions](/community)** and drop your idea — the community votes on what's next! 💡`,
  },

  /* ── COMMUNITY SUGGESTIONS ── */
  {
    patterns: /community|suggest|suggestion|feedback.*platform|feature.*request|upvote.*feature|comment.*suggest|emoji|gif|reaction.*comment|add.*emoji|insert.*gif|flag.*comment|country.*comment|nationality.*comment|timestamp.*comment/i,
    reply: `**Community Suggestions** 💬\n\nHave an idea to improve Gamerbuddy? Head to the **Community** page!\n\n• Submit feature suggestions\n• **Like or dislike** other suggestions\n• Reply with **threaded comments** for discussion\n• Admins can mark suggestions as approved or rejected\n\n🎉 **Comment features:**\n• **Nationality flag** 🇺🇸🇮🇳🇧🇷 — each commenter's country flag shows right next to their name, pulled from their profile\n• **Smart timestamps** — recent comments show "2 hours ago", older ones show the full date (hover any timestamp for the exact date & time)\n• **Emojis** 😀 — click the emoji button to pick from Gaming, Reactions & Hype categories\n• **GIFs** — click GIF to search Tenor or use quick tags: GG, EZ, Let's Go, Win, Rage…\n\n⚠️ **External links are not allowed** in comments for safety.\n\nPopular suggestions are reviewed by the Gamerbuddy team!`,
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
    reply: `🚨 **Hard stop — this is the #1 safety rule:**\n\n**NEVER share your account password.** Not for Steam, Epic, PlayStation, Xbox, Nintendo — literally nothing.\n\nReal Gamerbuddy gamers will **never** ask for your login. If someone does:\n1. Say no immediately\n2. Hit the 🚩 **Flag button** on their profile or bid and report them\n\nAll payments stay inside Gamerbuddy. If someone tries to move money outside the platform — gift cards, PayPal, anything — that's a scam. You'd lose all your buyer protection. Don't do it. Stay safe out there! 🛡️`,
  },

  /* ── YOU CANNOT HIRE YOURSELF ── */
  {
    patterns: /hire.*myself|bid.*own|self.*hire|own.*request/i,
    reply: `You **cannot hire yourself** on Gamerbuddy. 🚫\n\nThe platform prevents you from placing a bid on your own gaming request. This is a built-in safeguard to ensure fair competition and genuine transactions between different users.`,
  },

  /* ── SOCIAL MEDIA / FOLLOW ── */
  {
    patterns: /social|follow.*us|where.*find.*you|youtube|instagram|twitter|facebook|gamejolt|x\.com|our.*channel|official.*channel/i,
    reply: `We're on all the major platforms — come hang with us! 🎮\n\nCheck out our **[Socials page](/socials)** for the full rundown and direct links:\n\n• 🔴 **YouTube** → youtube.com/@gamerbuddy — streams, highlights & tournament replays\n• 🐦 **X (Twitter)** → x.com/gamerbuddy — live updates, giveaways & gaming takes\n• 📸 **Instagram** → instagram.com/gamerbuddy — community highlights & epic screenshots\n• 🟢 **GameJolt** → gamejolt.com/@gamerbuddy — game pages, dev logs & achievements\n• 🔵 **Facebook** → facebook.com/gamerbuddy — events, groups & announcements\n\nHit that follow button so you never miss a tournament, giveaway, or platform update. See you there! 🚀`,
  },

  /* ── REPORT / MODERATION ── */
  {
    patterns: /report|flag|toxic|ban|suspend|abuse|fake.*profile|fraud/i,
    reply: `**Reporting a User** 🚩\n\n1. Click the **Flag icon** next to any username — on Browse, on a bid, or on their profile\n2. Choose the reason: fraud, toxicity, fake profile, inappropriate content, etc.\n3. Add any extra context and submit\n\nOur moderation team reviews every report. Confirmed violations result in account suspension and forfeiture of pending earnings. Your report is confidential.`,
  },

  /* ── VERIFICATION / BADGE ── */
  {
    patterns: /verif|badge|trust.*factor|id.*check|how.*long.*verify|7.*day|15.*day|green.*tick/i,
    reply: `Verification is your ticket to the full Gamerbuddy experience — here's everything you need to know! ✅\n\n**How to complete verification:**\n1. Head to your **Profile** page\n2. ✉️ Confirm your **Email** address\n3. 📱 Verify your **Phone number**\n4. 🪪 Submit your **ID** for review (standard safety check)\n5. Done! Our team reviews and approves within **7–15 days**\n\n**While you wait, you can still:**\n• 👀 Browse all open requests and scout the competition\n• 📋 Prep your pitch and strategy\n\n**Once you're verified, you unlock everything:**\n• 💰 Place bids on sessions\n• 🏆 Join and compete in tournaments\n• 📋 Post your own game requests\n• 🤝 Hire gamers directly\n• The green **✅ Verified badge** on your profile and bids\n\nThat badge is a serious flex — hirers filter specifically for verified players, so your bids get way more attention. Get it done and watch those acceptances roll in! 🚀`,
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
  "Hmm, didn't quite catch that one — mind rephrasing? I'm best with: posting requests, bidding, wallets, bulk hiring, tournaments, verification, streaming, points, and safety! 🎮",
  "That one's got me stumped! Try asking something like: 'How does bidding work?', 'What's the platform fee?', 'How do I host a tournament?', or 'How does verification work?' — I'll have the full answer ready! 👾",
  "I might need a lil' more context on that! For tricky issues our support team's got you. But for features, rules, wallets, sessions, points, tournaments, bulk hiring — I'm your guy. What else can I help with? 🎯",
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
  "What is the platform fee?",
  "How does Bulk Hiring work?",
  "What is the verification time?",
  "How do I host a tournament?",
];

let msgIdCounter = 1;

export function AIChatWidget() {
  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Yo! 👾 I'm **Buddy** — your Gamerbuddy support homie, always online.\n\nI know this platform inside and out — requests, bidding, wallets, bulk hiring, tournaments, points, streaming, safety rules, and everything in between.\n\nTap a quick question below or just ask me anything. Let's get you that W! 🎮",
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
                  <span className="text-[10px] text-green-400 font-medium">Online · always got your back 🎮</span>
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
