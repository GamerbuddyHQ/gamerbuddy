import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Minimize2, Sparkles } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

/* ── KNOWLEDGE BASE ──────────────────────────────────────────
   All responses reflect Phase 1 (live) accurately.
   Phase 2 / 3 features are clearly labelled as Coming Soon.
   Patterns checked in order — more specific first.
───────────────────────────────────────────────────────────── */
const RESPONSES: Array<{ patterns: RegExp; reply: string }> = [

  /* ── GREETING / INTRO ── */
  {
    patterns: /^(hello|hi+|hey|yo|sup|howdy)\b|what can you (do|help)|who are you|what are you/i,
    reply: `Yo! 👾 I'm **Buddy** — your Gamerbuddy support homie, always online.\n\nWe're in **Phase 1** right now — the core hiring experience is fully live. Here's what I can help with:\n\n• 📋 **Posting & browsing requests**\n• 🎯 **Bidding** — verified users only\n• 💰 **Wallets** — Hiring Wallet & Earnings Wallet\n• 🔒 **Safety rules** — passwords, scams, reporting\n• ✅ **Verification** — get your badge (7–15 days)\n• ⭐ **Reviews** — how they work after a session\n• 💳 **Payments** — escrow, 10% platform fee, release\n• 🎁 **Tip / Gift** button after sessions\n• 💬 **Private chat** between hirers and gamers\n• 🛡️ **Trust Factor** & your profile\n\nMore features drop in Phase 2 — check the **[Roadmap](/roadmap)** for what's coming! Let's get you that W 🎮`,
  },

  /* ── POST / CREATE REQUEST ── */
  {
    patterns: /post|create.*request|new.*request|how.*request|hire.*someone|find.*gamer/i,
    reply: `Easy! Here's how to post a request and get skilled gamers knocking on your door 🎮\n\n**Requirements first:**\n• You need at least **$10.75 in your Hiring Wallet** to post\n• Your wallet is capped at **$1,000 max**\n\n**Steps:**\n1. Head to your **Dashboard** or click **"Post Request"**\n2. Fill in:\n   • **Game** — what you're playing\n   • **Platform** — PC, PS5, Xbox, Switch, Steam Deck, Mobile\n   • **Skill Level** — Beginner-Friendly, Decent, Best/Expert, Chill\n   • **Objectives** — be specific! (e.g. "Carry me to Diamond in Apex")\n   • **Preferred Nation** — any country or "Any / Worldwide"\n   • **Preferred Gender** — or "No preference"\n3. Submit — verified gamers start bidding immediately! 💥\n\n💡 **Pro tip:** Clear objectives = better bids. The more detail, the better players you attract!`,
  },

  /* ── BIDDING / GETTING HIRED ── */
  {
    patterns: /bid|apply.*request|get hired|become.*gamer|earn.*money|hired|place.*bid/i,
    reply: `Love the hustle! 💰 Before you start placing bids, there's one thing you need first:\n\n🔒 **Verification is required to place bids.** It keeps the platform safe for everyone — and it's a one-time thing!\n\n**How to get verified (takes 7–15 days):**\n1. Go to your **Profile** page\n2. Confirm your **Email** address\n3. Verify your **Phone number**\n4. Submit your **ID** for review\n5. Our team reviews and approves you 🎉\n\n**Once verified, here's how bidding works:**\n1. Head to **Browse Requests** and find sessions you can dominate\n2. Click **"Place Bid"** — set your price and write a pitch\n3. Hirer accepts → chat opens, coordinate via **private chat** and Discord\n4. Gamer clicks "Start Session" → hirer approves → you play\n5. Session completes → both drop a **review** (mandatory)\n6. 90% of the bid lands in your **Earnings Wallet** ✅\n\n💡 **You keep 90%** of every bid — we take a flat 10%. Verified badge + solid pitch = way more W's. Let's go!`,
  },

  /* ── PRIVATE CHAT / MESSAGING ── */
  {
    patterns: /chat|messag|inbox|dm|direct.*message|talk.*hirer|talk.*gamer|communicate|contact.*gamer/i,
    reply: `**Private Chat** 💬\n\nOnce a bid is accepted, a **private chat channel** opens between the hirer and the gamer.\n\n• Messages refresh in real time (polling every few seconds)\n• Use it to coordinate session details, agree on start time, and share your Discord tag\n• Chat is available on the **Request Detail** page\n\n**For voice coordination:** Since we don't have built-in voice yet, exchange your **Discord** details in the chat and connect there.\n\nChat history is preserved until the session closes — so no scrambling to find that Discord tag you shared earlier! 🎮`,
  },

  /* ── BULK HIRING — Phase 3 ── */
  {
    patterns: /bulk|multiple.*gamer|hire.*team|squad.*hire|group.*hire|hire.*squad/i,
    reply: `**Bulk Hiring** is coming in **Phase 3** — not yet available! 🔜\n\nWhen it drops, you'll be able to:\n• Set 2–100 slots in a single request\n• Approve each participant individually — full control\n• Pay per accepted gamer, each held in escrow separately\n• Perfect for raid teams, events & content creation\n\nFor now, post **individual requests** for each gamer you want to hire — works just as well for smaller sessions.\n\nCheck the **[Roadmap](/roadmap)** to stay updated on when Phase 3 goes live! 🗺️`,
  },

  /* ── TOURNAMENTS — Phase 3 ── */
  {
    patterns: /tournament|host.*tourney|prize.*pool|compete.*tournament|championship/i,
    reply: `**Tournaments** are coming in **Phase 3** — not yet live! 🏆\n\nHere's what's planned when they drop:\n• Free to enter for all participants\n• Hirers approve every participant — no randos\n• Prize pools from $100–$10,000\n• 10% platform fee on prize payouts\n• Nation/Gender filters for regional showdowns\n\nFor competitive play right now, post a request and hire an expert — it's the best way to level up your game in Phase 1!\n\nKeep an eye on the **[Roadmap](/roadmap)** for the Phase 3 launch date. 🗺️`,
  },

  /* ── WALLETS ── */
  {
    patterns: /wallet|deposit|withdraw|add.*fund|fund|money|pay(?:ment)?|transfer|balance/i,
    reply: `Gamerbuddy runs on **two separate wallets** — here's the full breakdown 💸\n\n🔵 **Hiring Wallet** — fund this to hire gamers\n• Deposit via **Razorpay** (UPI, GPay, PhonePe, Paytm…) or **Stripe** (Visa, Mastercard, international cards)\n• Min deposit: **$10.75** | Max wallet balance: **$1,000**\n• **Cannot be withdrawn** — only spent on game sessions and tips\n\n🟢 **Earnings Wallet** — where your gamer income lands\n• Earn 90% of every accepted bid when the session completes\n• Withdraw once your balance hits **$100 (≈ ₹8,300)**\n\n🔒 The moment a bid is accepted, funds lock into **escrow** — safe, untouchable by either side until the session is done.\n\nHead to **[Wallets](/wallets)** or **[Add Funds](/add-funds)** to get started! 💪`,
  },

  /* ── PLATFORM FEE ── */
  {
    patterns: /fee|commission|percent|10%|platform.*cut|how much.*charge/i,
    reply: `Totally fair question — here's exactly how it works 💰\n\nWe take a **flat 10% platform fee** on every completed Quest or Job. That's it — no hidden charges.\n\n• **Hirer pays** the full agreed bid amount\n• **90% goes to the gamer** straight into their Earnings Wallet 💸\n• **10% goes to Gamerbuddy** — covers platform costs, payment protection & support\n\n**Example:** Gamer bids $20 → Hirer pays $20 → Gamer receives **$18.00** ✅\n\n⚠️ **Tips/Gifts** after sessions are **fee-free** — 100% goes directly to the gamer.\n\nNo surprises, no fine print. Just a flat 10% every time a session completes.`,
  },

  /* ── ESCROW ── */
  {
    patterns: /escrow|refund|cancel|dispute|held|protect/i,
    reply: `**Escrow Protection** 🛡️\n\nWhen a hirer accepts a bid, funds are **immediately locked in escrow** — neither party can touch them until the session concludes.\n\n**What happens next:**\n• ✅ Session completes & both review → 90% releases to gamer's Earnings Wallet\n• ❌ Cancelled before session starts → full escrow returned to Hiring Wallet\n• 🚩 Dispute → our moderation team reviews and resolves it\n\nThe hirer explicitly clicks **"Release Payment"** (after both parties complete their reviews) — you always know where your money is. No surprise charges ever.`,
  },

  /* ── SESSION FLOW ── */
  {
    patterns: /session|start.*play|how.*work|flow|process|what happen|in.*progress|approv.*session/i,
    reply: `Here's the full session flow from start to finish 🎮\n\n1. **Post a request** with clear objectives\n2. Verified gamers browse and **place bids**\n3. Hirer reviews bids and **accepts the best one**\n4. Funds lock in **escrow** immediately\n5. Both parties coordinate via **private chat** (and Discord for voice)\n6. Gamer clicks **"Start Session"**\n7. Hirer **approves the start** — status flips to 🔴 **In Progress**\n8. You play together and complete the objectives\n9. Hirer clicks **"Release Payment"** — must do this to proceed\n10. Both drop a **mandatory review** (1–10 stars + written comment)\n11. ✅ 90% of the bid lands in the gamer's **Earnings Wallet** — both earn **50 points**\n\n💡 Reviews are mandatory — they unlock your 50-point reward AND finalise the payment. Don't skip them!`,
  },

  /* ── POINTS & REWARDS ── */
  {
    patterns: /point|pts|reward|rank|level|title|badge.*earn|how.*earn.*point/i,
    reply: `Gamerbuddy has its own XP system and it slaps 🔥\n\n**+50 points** every time you complete a session and leave a review. Both hirer and gamer earn 50 pts.\n\nPoints level up your **Trust Factor** and profile rank — higher rank = better visibility = more hirers choosing YOU.\n\nSpend points in the **Points Shop** (Steam-style) on your **Profile page**:\n• 🎨 **Profile backgrounds** — unique gradient themes\n• 🏷️ **Custom titles** — shown under your name (e.g. "Elite Carry", "Chill Coach")\n• These are **Phase 1 live** — you can buy and equip them right now!\n\nCheck your points balance and current rank on your **[Profile](/profile)** page. Time to stack those sessions! 💪`,
  },

  /* ── PROFILE SHOP / CUSTOMISATION ── */
  {
    patterns: /shop|profile.*custom|background|theme.*profile|cosmetic|steam.*style|personaliz/i,
    reply: `**Profile Customisation (Steam-style)** 🎨 — live in Phase 1!\n\nSpend your earned points in the **Points Shop** on your **Profile page**:\n\n• 🎨 **Profile backgrounds** — unique colour themes applied to your profile banner\n• 🏷️ **Custom titles** — displayed under your username (e.g. "Elite Carry", "Chill Coach")\n\nCustomised profiles stand out to hirers and show you take the platform seriously. Access the shop from **[Profile → Points section](/profile)**.\n\n💡 Points are earned by completing sessions and leaving reviews — 50 pts per completed session for both hirer and gamer!`,
  },

  /* ── MY QUEST / PORTFOLIO ── */
  {
    patterns: /quest|portfolio|showcase|what.*i.*offer|my.*skill|gamer.*portfolio/i,
    reply: `**My Quest** is your gamer showcase on your profile — live in Phase 1! 🎯\n\nAdd entries to show hirers exactly what you offer:\n• The **game** you play\n• **How you help** (e.g. "Carry to Platinum", "Raid leader", "Coach beginners")\n• Your **playstyle** (e.g. "patient, chill, mic optional")\n\nA detailed Quest section massively improves your bid acceptance rate — it's the difference between being scrolled past and getting hired immediately. Edit it from your **[Profile](/profile)** page.\n\n⚠️ Note: The upcoming **Quest System** (challenges with bonus points & badges) is a different feature arriving in **Phase 3**.`,
  },

  /* ── STREAMING CONNECTIONS — Phase 2+ ── */
  {
    patterns: /twitch|kick.*stream|stream.*connect|connect.*account|link.*stream|streaming.*platform/i,
    reply: `**Streaming platform connections** (Twitch, YouTube Gaming, Kick, etc.) are coming in **Phase 2** — not yet live! 🔜\n\nOnce available, you'll be able to link your streaming accounts to your profile to:\n• Show hirers you're an active streamer\n• Unlock the "Has Streaming" browse filter\n• Boost your profile's credibility\n\nFor now, **mention your streaming channel in your bid pitch** and in the **private chat** — hirers love knowing they might get featured on stream! 🎥\n\nCheck the **[Roadmap](/roadmap)** for Phase 2 details.`,
  },

  /* ── COMMUNITY — LIVE ── */
  {
    patterns: /community|suggest|idea|feature.*request|vote|upvote|downvote|comment.*community|community.*comment|gif.*community|emoji.*community|community.*tab|community.*page/i,
    reply: `**Community** is live on Gamerbuddy! 🎉 Find it in the navigation bar — it's the space where players shape what gets built next.\n\n**What you can do:**\n• 💡 **Post suggestions** — feature requests, bug reports, UI ideas, or anything else\n• 👍 **Like / 👎 Dislike** any suggestion (one vote per user, toggle to remove)\n• 💬 **Comment & reply** in threaded conversations\n• 😄 **Emoji picker** — tap the smiley button to drop any emoji in your comment\n• 🎬 **GIF support** — tap the GIF button to search and embed a reaction GIF\n• 🌍 **Nationality flags** — every commenter shows their country flag + username + timestamp\n\n**When posting:**\n• Pick a category: Feature Request, Bug Report, UI Improvement, or Other\n• External links are automatically removed for community safety\n• You'll see a warning if your text contained a link\n\n**Admin moderation** (admin-only):\n• Approve, Hide, or Delete any post — visible only to the platform admin\n\nGo voice your ideas — the most upvoted suggestions get prioritised! 🚀`,
  },

  /* ── LIKE / DISLIKE / PROFILE VOTES ── */
  {
    patterns: /like|dislike|thumbs|vote.*profile|endorse|profile.*rating|upvote/i,
    reply: `**Likes & Dislikes** are live in the **Community** tab! 🎉\n\nHead to **[Community](/community)** to:\n• 👍 Upvote suggestions you agree with\n• 👎 Downvote ones you don't\n• Toggle your vote — click again to remove it\n• One vote per user per suggestion — fair and spam-proof\n\nFor profile reputation, the best signal is **reviews** — a string of 9s and 10s gets you to the top of every hirer's shortlist. ⭐`,
  },

  /* ── NATION / GENDER PREFERENCES — Phase 1 ── */
  {
    patterns: /nation|country|region.*filter|gender|prefer.*country|prefer.*gender|filter.*gender|filter.*country/i,
    reply: `**Nation & Gender Preferences** are live in **Phase 1** 🌍\n\n**When posting a request:**\n• **Preferred Nation** — search and select any country (or "Any / Worldwide")\n• **Preferred Gender** — Male, Female, Non-binary, or No preference\n\n**When browsing requests:**\n• Use the **MATCH** filter row → Nation and Gender dropdowns\n• Active filters show as coloured tags you can remove with one click\n\nThese are preferences — gamers of any background can still bid, but the preference is shown clearly on the request card so everyone knows upfront. Fair and transparent! ✅`,
  },

  /* ── REGIONAL CLOCK — Phase 2 ── */
  {
    patterns: /clock|time.*zone|timezone|region.*time|world.*time|primary.*region|clock.*region/i,
    reply: `**Regional Clock** is coming in **Phase 2** — not yet live! 🕒\n\nWhen it drops, you'll see a live timezone clock in the navbar showing your pinned region — great for scheduling cross-region sessions.\n\nFor now, a quick tip: **mention your timezone in your bid pitch** and private chat so you and your hirer can agree on a session time without confusion 🌍\n\nCheck the **[Roadmap](/roadmap)** for the Phase 2 release. 🗺️`,
  },

  /* ── PHASE 2+ FEATURES — accurate catch-all ── */
  {
    patterns: /community.*suggest|suggest.*feature|feature.*request|emoji.*comment|gif.*comment|light.*dark|dark.*light|theme.*toggle|multi.*lang|language.*select/i,
    reply: `That feature is part of our phased rollout — coming soon! 🔜\n\nWe're building Gamerbuddy phase by phase to make sure everything works perfectly before unlocking more.\n\n**Right now — Phase 1 (Live):**\n✅ Post requests, bid, accept, play, review\n✅ Dual wallets with 10% platform fee\n✅ Verification (7–15 days)\n✅ Private chat between hirer & gamer\n✅ Gift / Tip button after sessions\n✅ Nation & Gender filtering\n✅ Points shop & profile customisation\n\n**Phase 2 (Coming Soon):**\n🔜 Improved Browse layout\n🔜 Community Suggestions (likes, emojis, GIFs)\n🔜 Light/Dark theme toggle\n🔜 Regional clock\n\n**Phase 3 (Future):**\n🔵 Bulk Hiring (2–100 gamers)\n🔵 Tournaments\n🔵 Quest System & Promoted Games\n\nCheck the **[Roadmap](/roadmap)** for all the details! 🗺️`,
  },

  /* ── ROADMAP / FUTURE FEATURES ── */
  {
    patterns: /roadmap|future.*feature|what.*coming|upcoming|phase|whats.*next|next.*update|coming.*soon|release|plan.*feature|feature.*plan/i,
    reply: `**Gamerbuddy Roadmap** 🗺️\n\n✅ **Phase 1 — Now Live**\n• Core hiring: post requests, bid (verified only), accept, play, review\n• Dual wallets — Hiring Wallet + Earnings Wallet\n• 10% platform fee on completed sessions\n• Escrow protection\n• Verification badge (7–15 days)\n• Private chat per session\n• Gift / Tip button after sessions\n• Nation & Gender filtering\n• Points shop & profile customisation\n• Safety rules & reporting system\n\n🔜 **Phase 2 — Coming Soon**\n• Improved Browse page layout\n• Community Suggestions (emojis, GIFs, threaded comments)\n• Light / Dark theme toggle\n• Regional clock (selectable timezones)\n\n🔵 **Phase 3 — Future**\n• Bulk Hiring (2–100 gamers)\n• Tournaments (free to enter, hirer approves)\n• Quest System with bonus challenges\n• Promoted / Spotlight Games\n\n🚀 **Phase 4 — Long Term**\n• Advanced AI features\n• Full social layer & streaming integrations\n• Open API for developers\n\nFull details on the **[Roadmap page](/roadmap)**! 🗺️`,
  },

  /* ── COMMUNITY SUGGESTIONS — Phase 2 ── */
  {
    patterns: /community|suggest|suggestion|feedback.*platform|emoji|gif|reaction|flag.*comment/i,
    reply: `**Community Suggestions** is coming in **Phase 2** — not yet live! 💬\n\nWhen it launches:\n• Submit feature ideas and vote on others\n• Threaded comments with emoji reactions and GIFs\n• Nationality flags on commenter profiles\n• Admins can approve or reject suggestions\n\nHave a feature idea right now? Our team reads support chats — feel free to tell me what you'd love to see and I'll pass the vibe along! 💡\n\nCheck the **[Roadmap](/roadmap)** for Phase 2 details.`,
  },

  /* ── PROMOTED / SPOTLIGHT GAMES — Phase 3 ── */
  {
    patterns: /spotlight|promoted|featured.*game|bonus.*reward|special.*game|highlight.*game/i,
    reply: `**Spotlight & Promoted Games** are coming in **Phase 3** — not yet live! ✨\n\nWhen it drops:\n• Certain games get spotlighted with **bonus point rewards**\n• Promoted games appear highlighted in Browse and on the homepage\n• Great incentive for gamers to bid on in-demand games\n\nFor now, **any game** you play is eligible — just post your request or bid normally and earn your 50 points per session like everyone else! 🎮\n\nCheck the **[Roadmap](/roadmap)** for Phase 3 details.`,
  },

  /* ── REVIEWS ── */
  {
    patterns: /review|rating|stars?|feedback|rate.*session|leave.*review/i,
    reply: `**Reviews** ⭐ — mandatory for both players after every session!\n\n• Rating: **1–10 stars**\n• Written comment: minimum **10 characters**\n• **Both** the hirer and the gamer must review before payment finalises\n\nReviews are what:\n• ✅ **Release the 90% payout** to the gamer\n• ✅ **Award 50 points** to both players\n• ✅ **Build your Trust Factor** and profile rank\n\nHirers heavily weigh recent reviews when choosing bids — consistent 9s and 10s put you at the top of every list. Take your time and write something real! 🌟`,
  },

  /* ── TIP / GIFT ── */
  {
    patterns: /tip|gift|bonus.*pay|extra.*pay|send.*extra|thank.*gamer/i,
    reply: `**Tips & Gifts** 🎁 — available in Phase 1!\n\nAfter a session completes (or enters the review stage), hirers can tap the **Gift / Tip** button to send a bonus directly to the gamer.\n\n• 💸 Tips go **100% to the gamer** — **no platform fee** on tips\n• Deducted from your **Hiring Wallet**\n• Shows as a separate "Tip Received" entry in the gamer's transaction history\n\nA great way to reward a gamer who went above and beyond! Find the Gift button on the **Request Detail** page once the session wraps.`,
  },

  /* ── VOICE CHAT / DISCORD ── */
  {
    patterns: /voice|discord|mic|jitsi|voice.*chat|voip|call|talking/i,
    reply: `**Voice Coordination** 🎙️\n\nGamerbuddy doesn't have built-in voice chat right now — but here's the standard flow:\n\n1. Once a bid is accepted, use the **private chat** to share your **Discord tag**\n2. Add each other on Discord and jump in a voice channel\n3. Coordinate start time, strategy, and objectives before the session begins\n\n🔑 **Always let the hirer decide** if they want voice or text-only — some players prefer no mic. Respecting this is part of the **Gamer Code of Conduct** — violations can be reported.\n\nBuilt-in voice/Jitsi integration is being evaluated for a future phase. For now, Discord is the go-to! 🎧`,
  },

  /* ── RECORDING ── */
  {
    patterns: /record|stream.*session|capture|obs|clip/i,
    reply: `**Recording Sessions** 📹\n\nRecording is **entirely optional** and the responsibility of the person doing it.\n\n• Gamerbuddy does not record sessions on your behalf\n• If you plan to record or stream, **tell the other party before starting** — consent is key\n• Surprise recording without consent is a violation of the Code of Conduct and can be reported\n\nSimple rule: communicate first, record second. ✅`,
  },

  /* ── SAFETY / PASSWORDS ── */
  {
    patterns: /password|account.*shar|never.*share|security|scam|phish|login.*detail/i,
    reply: `🚨 **Hard stop — this is the #1 safety rule on Gamerbuddy:**\n\n**NEVER share your account password.** Not Steam. Not Epic. Not PlayStation. Not Xbox. Not your Gamerbuddy account. Nothing.\n\nReal verified gamers will **never** ask for your login. If anyone does:\n1. Say no\n2. Hit the 🚩 **Report** button and flag them immediately\n\n**Also watch out for:**\n• Anyone asking to move money outside Gamerbuddy (PayPal, gift cards, bank transfer) — instant scam, you lose your escrow protection\n• Fake profiles with no verification badge\n• Suspiciously low bids with pressure to "pay me directly"\n\nAll payments on Gamerbuddy are protected by escrow. If it's not going through the platform, it's not safe. 🛡️`,
  },

  /* ── YOU CANNOT HIRE YOURSELF ── */
  {
    patterns: /hire.*myself|bid.*own|self.*hire|own.*request/i,
    reply: `You **cannot hire yourself** on Gamerbuddy 🚫\n\nThe platform prevents placing a bid on your own request. This is a built-in safeguard to ensure fair competition and genuine transactions between different users — we check this at the API level, not just the UI.`,
  },

  /* ── SUPERR.BIO / ALL LINKS ── */
  {
    patterns: /superr\.bio|linktree|link.*bio|bio.*link|all.*social|all.*link|every.*platform|find.*everything|one.*link/i,
    reply: `The easiest way to find everything Gamerbuddy is our link-in-bio page! 🔗\n\n**[👉 superr.bio/gamerbuddy](https://www.superr.bio/gamerbuddy)**\n\nIt's our central hub — one link with all our platforms, Discord server, social channels, and everything else in one place. Bookmark it! 🚀`,
  },

  /* ── DISCORD ── */
  {
    patterns: /discord|join.*server|server.*link|discord.*link|join.*discord/i,
    reply: `You can find all our social links, Discord, and community in one place by clicking the **"Social"** tab in the navigation. 🔗\n\nIt takes you directly to our hub — every platform, every update, all in one place!`,
  },

  /* ── SOCIAL MEDIA / FOLLOW ── */
  {
    patterns: /social|follow.*us|where.*find.*you|youtube|instagram|twitter|facebook|gamejolt|x\.com|our.*channel|official.*channel/i,
    reply: `You can find all our social links, Discord, and community in one place by clicking the **"Social"** tab in the navigation. 🔗\n\nYouTube, Instagram, X, Facebook, GameJolt — every platform, every link, all in one hub!`,
  },

  /* ── REPORT / MODERATION ── */
  {
    patterns: /report|flag|toxic|ban|suspend|abuse|fake.*profile|fraud/i,
    reply: `**Reporting a User** 🚩\n\n1. Click the **Flag / Report icon** on any bid, profile, or in the session\n2. Choose the reason: fraud, toxicity, fake profile, password request, inappropriate content, etc.\n3. Add context and submit — takes 30 seconds\n\nOur moderation team reviews every report. Confirmed violations result in:\n• Account suspension\n• Forfeiture of pending earnings\n• Permanent ban for serious offences\n\nYour report is **100% confidential** — the reported user is never told who flagged them.`,
  },

  /* ── VERIFICATION / BADGE ── */
  {
    patterns: /verif|badge|trust.*factor|id.*check|how.*long.*verify|7.*day|15.*day|green.*tick/i,
    reply: `Verification is your ticket to bidding on Gamerbuddy — here's everything! ✅\n\n**How to get verified (one-time, 7–15 days):**\n1. Go to your **Profile** page\n2. ✉️ Confirm your **Email** address\n3. 📱 Verify your **Phone number**\n4. 🪪 Submit your **ID** for review\n5. Our team reviews and approves — you'll see a celebration modal instantly! 🎉\n\n**While you wait, you can:**\n• Browse all open requests and scout the competition\n• **Start filling out your profile now** — bio, region, connected accounts\n• Top up your Hiring Wallet if you plan to hire\n\n**Once verified, you can:**\n• 💰 **Place bids** on any open session\n• 📋 **Post your own requests** to hire gamers\n• 🤝 **Accept bids** and start sessions\n• Show the green **✅ Verified badge** on your profile and every bid\n\n🌟 **Pro tip:** Right after verification, we'll prompt you to complete your profile — a full profile with bio, region, and connected gaming accounts gets you **significantly more bids and better matches**. Hirers trust complete profiles! Don't skip it. 🚀`,
  },

  /* ── PROFILE COMPLETION ── */
  {
    patterns: /profile.*complet|complet.*profile|finish.*profile|setup.*profile|profile.*setup|fill.*profile|profile.*fill|bio|about.*me|my.*profile/i,
    reply: `**Profile Completion** ✨ — the secret weapon for getting more bids!\n\nOnce your account is verified, we **strongly recommend** filling out every section of your profile. Here's why it matters and what to add:\n\n**1. ✍️ Bio (30% of profile score)**\nWrite a short intro about yourself — your gaming style, favorite genres, and what kind of sessions you enjoy. Hirers read this before accepting bids!\n\n**2. 🌍 Region & Gender (30%)**\nSet your country and gender so hirers can filter specifically for you. This is huge for getting matched to the right requests.\n\n**3. 🔗 Connected Gaming Accounts (40%)**\nLink your Steam, Epic, PlayStation, Xbox, or other accounts on your profile. It proves you're a real, active gamer — builds serious trust.\n\n**Progress bar 📊**\nYour profile has a built-in completion tracker — it shows your score out of 100% and highlights exactly what's missing. Aim for 80%+ to unlock the **Trust badge**.\n\n**After verification**, you'll see a "Finish Your Profile" banner on your Dashboard and profile page guiding you through each step. It takes less than 2 minutes — and the payoff in better matches is worth every second! 💪`,
  },

  /* ── TRUST FACTOR ── */
  {
    patterns: /trust|trust.*factor|reputation|credib/i,
    reply: `**Trust Factor** 🛡️\n\nYour Trust Factor is a composite score that represents your overall reliability on the platform:\n\n• ⭐ **Average review rating** from all completed sessions\n• 🎮 **Total sessions completed** (more sessions = more trust)\n• ✅ **Verified status** (required for bidding)\n\nThe formula caps at 100: avg rating × 10 + up to 20 bonus points from sessions.\n\nA high Trust Factor gives you:\n• Better visibility when hirers are comparing bids\n• Access to higher-value requests\n• A competitive edge over lower-rated gamers\n\nThe fastest way to build it: **complete sessions + leave honest reviews**. Every session counts!`,
  },

  /* ── CONTACT / SUPPORT ── */
  {
    patterns: /contact.*support|support.*email|email.*support|reach.*support|reach.*team|how.*contact|email.*us|email.*team|contact.*us|get.*in.*touch|how.*reach|reach.*you/i,
    reply: `You can find all our social links, Discord, and community in one place by clicking the **"Social"** tab in the navigation. 🔗\n\nThis is the best way to connect with us — every platform, direct community access, all in one place!`,
  },

  /* ── GENERAL HELP ── */
  {
    patterns: /help|support|question|how.*work|what.*is.*gamerbuddy|about.*platform/i,
    reply: `**Gamerbuddy** is a global gaming marketplace — hire skilled gamers for co-op, ranked sessions, raids, and more across PC, PlayStation, Xbox, Switch, Steam Deck, and Mobile 🎮\n\n**Phase 1 is live right now. Here's the core:**\n• Post requests → receive bids → hire verified gamers\n• Bids require verification (7–15 days) — keeps it safe\n• 10% platform fee on every completed session\n• Funds held in escrow until session is approved\n• Two wallets: Hiring (spend) & Earnings (receive)\n• Withdraw earnings once you hit $100\n• Private chat between hirer and gamer\n• Gift button for optional tips after sessions\n• Points earned per session → spend in Profile Shop\n\nFor anything beyond what I can answer, click the **"Social"** tab in the navigation to reach all our links and community. 🔗\n\nAsk me about any specific feature and I'll give you the full breakdown!`,
  },
];

const FALLBACK_RESPONSES = [
  "Hmm, didn't catch that one — mind rephrasing? I'm best with Phase 1 features: posting requests, bidding, wallets, verification, reviews, escrow, gifts, private chat, and safety! 🎮",
  "That one's got me stumped! Try asking: 'How does bidding work?', 'What's the platform fee?', 'How does escrow work?', or 'How does verification work?' — full answers ready! 👾",
  "Need more context on that one! For anything I can't resolve, hit the **'Social'** tab in the nav to reach all our links and community. For Phase 1 features — requests, wallets, sessions, points, safety, reviews — I'm your guy. What else can I help with? 🎯",
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
  "How does bidding work?",
  "What is the verification time?",
  "How does escrow work?",
  "How do I contact support?",
];

let msgIdCounter = 1;

export function AIChatWidget() {
  const [open, setOpen]           = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Yo! 👾 I'm **Buddy** — your Gamerbuddy support homie, always online.\n\nWe're in **Phase 1** — core hiring is fully live! I know every feature inside out: posting requests, bidding (verified users only), wallets, escrow, platform fee, reviews, tips, private chat, and safety rules.\n\nTap a quick question below or just ask me anything. Let's get you that W! 🎮",
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
      480 + Math.random() * 320,
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-4 py-3 font-bold text-sm text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)", boxShadow: "0 0 24px rgba(168,85,247,0.45), 0 4px 20px rgba(0,0,0,0.4)" }}
        aria-label="Open AI Support"
      >
        <div className="relative">
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-purple-700 animate-pulse" />
        </div>
        <span className="hidden sm:inline">AI Support</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
      style={{
        width: "clamp(320px, 90vw, 390px)",
        height: minimized ? "56px" : "clamp(420px, 70vh, 560px)",
        background: "linear-gradient(180deg, #0d0620 0%, #080415 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
        boxShadow: "0 0 40px rgba(168,85,247,0.18), 0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.6) 0%, rgba(168,85,247,0.4) 100%)", borderBottom: "1px solid rgba(168,85,247,0.2)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#0d0620]" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-white leading-none">Buddy</div>
            <div className="text-[10px] text-green-400 font-semibold mt-0.5">● Phase 1 Support · Always Online</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            aria-label={minimized ? "Expand" : "Minimise"}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5"
                  style={
                    msg.role === "assistant"
                      ? { background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }
                      : { background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)" }
                  }
                >
                  {msg.role === "assistant"
                    ? <Bot className="h-3.5 w-3.5 text-primary" />
                    : <User className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
                <div
                  className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={
                    msg.role === "assistant"
                      ? { background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", color: "rgba(255,255,255,0.88)" }
                      : { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)", color: "rgba(255,255,255,0.92)" }
                  }
                >
                  {renderMarkdown(msg.text)}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-3.5 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="shrink-0 text-[11px] font-semibold rounded-full px-3 py-1.5 border border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary transition-all whitespace-nowrap"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Socials quick-action */}
          <div className="px-3.5 pb-2 shrink-0">
            <a
              href="https://www.superr.bio/gamerbuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)",
                boxShadow: "0 0 14px rgba(168,85,247,0.25)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              All Socials &amp; Links
            </a>
          </div>

          {/* Input */}
          <div className="px-3.5 pb-3.5 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(168,85,247,0.12)" }}>
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.2)" }}
            >
              <input
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                placeholder="Ask about Phase 1 features…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                maxLength={300}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0"
                style={input.trim()
                  ? { background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
