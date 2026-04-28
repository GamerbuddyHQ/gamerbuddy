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
    reply: `Yo! 👾 I'm **Buddy** — your Player4Hire support homie, always online.\n\nWe're in **Phase 1** right now — the full core experience is live! Here's what I can help with:\n\n• 📋 **Posting & browsing requests** — verify + activate your account to unlock\n• 🎯 **Bidding** — link a gaming account → get verified → pay one-time activation fee → start bidding!\n• ⚡ **Activation fee** — one-time fee after verification (🌍 $5 Global / 🇮🇳 ₹149 India)\n• 💰 **Wallets** — Hiring Wallet & Earnings Wallet\n• 🔒 **Safety rules** — passwords, scams, reporting\n• ✅ **Verification** — link your gaming account → reviewed in 24–48 hours → Green badge!\n• 🎮 **Gaming account linking** — Steam, Epic, PlayStation, Xbox, Switch — all live!\n• 💬 **Community tab** — suggestions, voting, comments — live now!\n• ⭐ **Reviews** — how they work after a session\n• 💳 **Payments** — escrow, 10% platform fee, release\n• 🎁 **Tip / Gift** button after sessions\n• 🌐 **Social hub** via Superr.bio\n\n**Phase 2 coming soon:** Tournaments, Bulk Hiring (3–100), Automatic Payouts, Advanced Real-Time Features. Check the **[Roadmap](/roadmap)** for what's next! Let's get you that W 🎮`,
  },

  /* ── MINIMUM HIRING FEE / PRICING ── */
  {
    patterns: /minimum.*fee|min.*fee|minimum.*rate|min.*rate|minimum.*price|minimum.*pay|how much.*cost|what.*cost.*hire|pricing|how much.*hire|hire.*cost|rate.*per hour|per.hour|hourly.*rate|₹200|₹350|rupee|inr.*rate|india.*rate|international.*rate|\$5|\$8|5 usd|8 usd|usd.*per hour|fair pay/i,
    reply: `💰 **Minimum Hiring Fee — Fair Pay for Gamers**\n\nPlayer4Hire enforces a regional minimum rate to protect Gamers' time and effort:\n\n🇮🇳 **India:** Minimum **₹200 per hour**\n🌍 **International (all other countries):** Minimum **$5 USD per hour**\n\n**How it works:**\n• When you post a hiring request, select your region (India or International)\n• Choose how many hours you need (e.g. 2 hours)\n• The system calculates your minimum: e.g. 2 hrs × ₹200 = **₹400 minimum** (India) or 2 hrs × $5 = **$10 minimum** (International)\n• This minimum is displayed clearly on your request so Gamers know the expected rate\n\n**Why this exists:**\nGaming is skilled work. The minimum rate ensures every Gamer is compensated fairly and prevents exploitatively low offers.\n\nYou can see the minimum rate on every request listing on the **[Browse page](/browse)** and in the bid panel when placing a bid. 🎮`,
  },

  /* ── DISCLAIMER / LIABILITY / GUARANTEES ── */
  {
    patterns: /disclaimer|liability|liable|guarantee|warrant|performance guarantee|player4hire.*responsible|responsible.*player4hire.*gamerbuddy|legal.*terms|terms.*legal|platform.*guarantee|guarantee.*platform|suing|sue.*platform|legal.*action|no.*guarantee|refund.*policy|money.*back/i,
    reply: `📋 **Player4Hire Disclaimer — Key Points**\n\nHere's the balanced summary of our full Disclaimer (see the **[About page](/about)** for all 14 sections):\n\n**What Player4Hire is:**\nAn online intermediary marketplace connecting Hirers and Gamers — we facilitate the connection, not the gaming session itself.\n\n**What we don't guarantee:**\n• The skill, reliability, punctuality, or behavior of any individual Gamer or Hirer\n• Uninterrupted or error-free platform availability (we're in early development)\n• Session outcomes or in-game results\n\n**What we do protect:**\n🔒 All payments go through **escrow** — your funds are held safely until the session is properly completed\n✅ Both sides have clear protections, a review process, and a full chat history\n🚩 Report button is always available for misconduct\n\n**Limitation of Liability:**\nTo the extent permitted by law, Player4Hire is not liable for disputes between users, in-game losses, account penalties, or technical failures.\n\n**Our advice:**\nAlways review profiles, Trust Factor, and past reviews before hiring. Record your sessions using your own tools — if no recording exists during a dispute, we may be unable to investigate.\n\nFull Disclaimer → **[/about](/about)**`,
  },

  /* ── PROFILE PHOTOS ── */
  {
    patterns: /profile.photo|profile.pic|photo.*require|gallery.*photo|real.*photo|fake.*photo|ai.*photo|ai.*image|fake.*image|duplicate.*photo|same.*photo|photo.*rule|photo.*policy|picture.*rule|minimum.*photo|required.*photo/i,
    reply: `📸 **Profile Photos — Real People Only**\n\nPlayer4Hire requires every user to upload:\n\n• **1 main profile picture** — shown on your profile, bid cards, and browse listings\n• **At least 2 additional gallery photos** — these build trust with hirers and gamers\n\n**Strict rules — no exceptions:**\n❌ No AI-generated or digitally fake images\n❌ No group photos — solo shots only\n❌ No stolen / stock photos\n❌ Duplicate photos are auto-blocked (same image uploaded twice is rejected)\n\nPhotos are reviewed by our moderation team. Using fake or AI-generated photos is a **serious policy violation** and can lead to immediate account suspension and forfeiture of earnings.\n\nAdd your photos on your **[Profile](/profile)** page under "Additional Photos". ✅`,
  },

  /* ── POST / CREATE REQUEST ── */
  {
    patterns: /post|create.*request|new.*request|how.*request|hire.*someone|find.*gamer/i,
    reply: `Easy! Here's how to post a request and get skilled gamers knocking on your door 🎮\n\n**Requirements first:**\n• Your account must be **verified + activated** (one-time activation fee: 🌍 $5 / 🇮🇳 ₹149)\n• You need at least **$10.75 in your Hiring Wallet** to post\n• Your wallet is capped at **$1,000 max**\n\n**Steps:**\n1. Head to your **Dashboard** or click **"Post Request"**\n2. Fill in:\n   • **Game** — what you're playing\n   • **Platform** — PC, PS5, Xbox, Switch, Steam Deck, Mobile\n   • **Skill Level** — Beginner-Friendly, Intermediate, Expert, Chill\n   • **Objectives** — be specific! (e.g. "Carry me to Diamond in Apex")\n   • **Your Region** — India or International (sets the minimum hiring fee)\n   • **Session Hours** — how many hours you need (1–24)\n   • **Preferred Nation** — any country or "Any / Worldwide"\n   • **Preferred Gender** — Male, Female, Non-binary, or No preference\n   • **Request Expiry** — Forever, 24h, 48h, or 7 days\n3. Submit — verified gamers start bidding immediately! 💥\n\n💰 **Minimum Hiring Fee (enforced):**\n🇮🇳 India: **₹200/hr** · 🌍 International: **$5 USD/hr**\nThe total minimum (hours × rate) is shown clearly on your listing so gamers know the expected floor.\n\n💡 **Pro tip:** Clear objectives = better bids. The more detail, the better players you attract!`,
  },

  /* ── REQUEST EXPIRY ── */
  {
    patterns: /expir|how long.*open|request.*close|close.*request|no.*bid.*why|why.*no.*bid|request.*expire|time.*left|auto.*close/i,
    reply: `**Request Expiry** ⏰\n\nWhen you post a request, you choose how long it stays open if nobody bids:\n\n• **♾️ Forever** (default) — stays open until you cancel it manually\n• **⏰ 24 Hours** — auto-closes after 24h with zero bids\n• **⏰ 48 Hours** — auto-closes after 48h with zero bids\n• **📅 7 Days** — auto-closes after 7 days with zero bids\n\n**Key rules:**\n• Expiry only triggers if there are **zero bids** — if even one gamer bids, it stays open!\n• Expired requests show as **"expired"** in your My Requests page\n• Browse hides expired requests by default (toggle **"Show Expired"** to see them)\n• You can always cancel manually before expiry\n\n💡 **Pro tip:** If your request has been open 24h+ with no bids, try improving your objectives description or refreshing interest on the Community tab!`,
  },

  /* ── BIDDING / GETTING HIRED ── */
  {
    patterns: /bid|apply.*request|get hired|become.*gamer|earn.*money|hired|place.*bid/i,
    reply: `Love the hustle! 💰 Here's the **full path to placing bids:**\n\n**Step 1 — Link a gaming account**\nGo to your **[Profile](/profile)** → "Gaming Accounts" → connect Steam, Epic, PSN, Xbox, or Nintendo Switch. Keep it public during review.\n\n**Step 2 — Wait for verification (24–48 hours)**\nOur team reviews your account. Once approved, you get your ✅ Verified badge.\n\n**Step 3 — Pay the one-time activation fee**\nA prompt appears on your Dashboard after verification:\n🌍 **Global → $5 USD** · 🇮🇳 **India → ₹149** (one-time only, never charged again)\nThis protects the community from fake/bot accounts.\n\n**Step 4 — Start bidding!**\n1. Head to **[Browse Requests](/browse)** and find sessions you can dominate\n2. Click **"Place Bid"** — set your price and write a pitch\n3. Hirer accepts → private chat opens, coordinate via **chat** and Discord\n4. Gamer clicks "Start Session" → hirer approves → you play\n5. Session completes → both drop a **review** (mandatory)\n6. **90% of the bid** lands in your **Earnings Wallet** ✅\n\n💡 You keep 90% of every bid — flat 10% platform fee. Solid profile + great pitch = way more W's. Let's go!`,
  },

  /* ── PRIVATE CHAT / MESSAGING ── */
  {
    patterns: /chat|messag|inbox|dm|direct.*message|talk.*hirer|talk.*gamer|communicate|contact.*gamer/i,
    reply: `**Private Chat** 💬\n\nOnce a bid is accepted, a **private chat channel** opens between the hirer and the gamer.\n\n• Messages refresh in real time (polling every few seconds)\n• Use it to coordinate session details, agree on start time, and share your Discord tag\n• Chat is available on the **Request Detail** page\n\n**For voice coordination:** Since we don't have built-in voice yet, exchange your **Discord** details in the chat and connect there.\n\nChat history is preserved until the session closes — so no scrambling to find that Discord tag you shared earlier! 🎮`,
  },

  /* ── BULK HIRING — Phase 2 ── */
  {
    patterns: /bulk|multiple.*gamer|hire.*team|squad.*hire|group.*hire|hire.*squad/i,
    reply: `**Bulk Hiring** is coming in **Phase 2** — not available yet! 🔜\n\nRight now in Phase 1, only **single 1-on-1 hiring requests** are supported. Bulk Hiring will let you:\n• Set 3–100 slots in a single request\n• Approve each participant individually — full control\n• Pay per accepted gamer, each held in escrow separately\n• Perfect for raid teams, events & content creation\n\nFor now, post **individual requests** for each gamer you need — works great for smaller sessions.\n\nCheck the **[Roadmap](/roadmap)** to see when Phase 2 goes live! 🗺️`,
  },

  /* ── TOURNAMENTS — Phase 2 ── */
  {
    patterns: /tournament|host.*tourney|prize.*pool|compete.*tournament|championship/i,
    reply: `**Tournaments** are coming in **Phase 2** — not live yet! 🏆\n\nPhase 1 supports only core 1-on-1 hiring sessions. When Tournaments drop in Phase 2:\n• Free to enter for all participants\n• Hirers approve every participant — no randos\n• Prize pools from $100–$10,000\n• 10% platform fee on prize payouts\n• Nation/Gender filters for regional showdowns\n\nFor competitive play right now, post a request and hire an expert — it's the best way to level up your game today!\n\nKeep an eye on the **[Roadmap](/roadmap)** for the Phase 2 launch. 🗺️`,
  },

  /* ── COMMUNITY GUIDELINES / BEHAVIOR / SAFETY / REPORTING ── */
  {
    patterns: /community.?guide|behavior.?rule|behaviour.?rule|rules.*platform|platform.*rules|conduct|harassment|toxic|hate.?speech|inappropriate|nsfw|explicit.*content|nude|sexual.*content|report.*user|report.*behavior|how.*report|what.*report|safe.*platform|feel.*unsafe|uncomfortable|privacy.*rule|fair.?play|ghosting|troll|professional.*comm|respect.*player|ban.*rule|suspension.*rule|consequences.*rule/i,
    reply: `🛡️ **Community Guidelines & Behavior Rules**\n\nAll users — Hirers and Gamers — must follow these rules:\n\n**1. 🤝 Be Respectful and Polite**\nTreat every player with kindness. No harassment, toxicity, hate speech, or personal attacks.\n\n**2. 🚫 No Inappropriate Content**\nSharing nudes, explicit images, sexual content, or NSFW material is strictly prohibited. Violators face immediate account suspension.\n\n**3. 💬 Professional Communication Only**\nKeep chats focused on gaming sessions. No asking for personal information, extra photos outside the gallery, or engaging in romantic/flirting behaviour.\n\n**4. 🔒 Respect Privacy**\nNever share another user's Discord username, Steam profile, or personal details outside the platform without their permission.\n\n**5. ✅ Fair Play**\nComplete sessions honestly. No ghosting, trolling, or intentionally ruining the experience for others.\n\n---\n\n**⚠️ Consequences**\nBreaking these rules may result in:\n• A warning on your account\n• Temporary suspension\n• Permanent ban\n\nPlayer4Hire reserves the right to remove any user who makes others feel unsafe or uncomfortable — without prior notice.\n\n**To report a user:** Use the 🚩 **Report** button visible on their profile or bid card. Our team reviews every report.\n\nFull guidelines in our **[About / Disclaimer, Section 5](/about)**. 📋`,
  },

  /* ── USER ID / GB- ID ── */
  {
    patterns: /user.?id|gb.?\d{4,}|gamerbuddy.?id|my.?id|what.?is.?my.?id|share.?id|find.?my.?id|where.?is.?my.?id|id.?number|account.?id|profile.?id|gb-\d/i,
    reply: `🪪 **Your Player4Hire User ID (GB-XXXXXX)**\n\nEvery account on Player4Hire has a unique **User ID** in the format **GB-000001**. It's permanent, public-friendly, and can never change.\n\n**Where to find your User ID:**\n• 👤 **Profile page** — shown below your username with a Copy button\n• 💰 **Wallets page** — shown in the Earnings Wallet card header\n• 🎮 **Session / Request Detail pages** — shown at the top so you can share it with your session partner\n• 🔧 **Admin payout panel** — shown on every withdrawal request\n\n**How to copy it:**\nClick the **GB-XXXXXX** badge on any of those pages — it will copy to your clipboard instantly and show a green **"Copied!"** confirmation.\n\n**Why use it?**\nShare your User ID with people you're gaming with so they can:\n• Identify you during live sessions\n• Reference you in payout or support queries\n• Find you on the platform by your ID\n\n📌 Your ID is shown on your profile page — navigate to **[My Profile](/profile)** to see it now!`,
  },

  /* ── FUNDS CUSTODY / WHERE IS MY MONEY ── */
  {
    patterns: /where.*money|where.*fund|where.*held|who hold|hold.*fund|custody|custod|gamerbuddy.*hold|hold.*earn|earn.*held|safe.*money|money.*safe|trust.*money|platform.*hold/i,
    reply: `🔒 **Where Are Your Funds Held?**\n\nGreat question — here's the full transparency:\n\n**Hiring Wallet (Hirers)**\nFunds you deposit are held by Player4Hire in our own account. When you post a request and a bid is accepted, those funds are locked in escrow — still with us, but ring-fenced for that specific session.\n\n**Earnings Wallet (Gamers)**\nYour earned balance is held by Player4Hire and represents amounts owed to you. The balance in your Earnings Wallet is not a bank account — it's a record of what we owe you. Funds sit with us until you request a withdrawal and we process it.\n\n**When are funds released?**\n• Escrow is released automatically when both parties complete reviews\n• Earnings are credited immediately after session completion + reviews\n• Withdrawals are processed **every Monday** by our team\n\n**Settlement times after Monday processing:**\n🇮🇳 India (UPI / Bank Transfer): **1–2 business days**\n🌍 International (Bank Transfer): **5–7 business days**\n\n**Player4Hire is not a bank** and does not pay interest on held funds. Full details in our **[Disclaimer, Section 5](/about)**. 📋`,
  },

  /* ── PAYOUT TIMING / WITHDRAWAL SCHEDULE ── */
  {
    patterns: /payout|pay.?out|when.*get paid|when.*paid|withdrawal.*time|time.*withdraw|how long.*withdraw|how long.*pay|when.*money|monday.*payout|weekly.*payout|payout.*week|5.7.*day|5-7.*business|international.*withdraw|india.*withdraw|upi.*withdraw|bank.*transfer.*time|instant.*pay|same.?day.*pay|difference.*payout|indian.*payout|global.*payout/i,
    reply: `💸 **Player4Hire Payout Policy — Full Breakdown**\n\n**Step 1 — Earn your money**\nYour earnings land in your **Earnings Wallet immediately** after:\n✅ Session is marked complete\n✅ Both parties have submitted their reviews\n\n---\n\n**Step 2 — Reach the $100 threshold**\nOnce your Earnings Wallet balance reaches **$100 USD**, a **"Request Withdrawal"** button appears on your Wallets page.\n\n---\n\n**Step 3 — Click "Request Withdrawal"**\nYou'll see a confirmation that your request has been received. Your full balance is queued for the next payout batch.\n\n---\n\n**Step 4 — Get paid every Monday**\n📅 Payouts are processed **manually every Monday** for security and accuracy\n⏱️ Funds arrive in your account within **5–7 business days** after Monday processing\n\n**Example:** Request on Wednesday → processed next Monday → money in your account by the following week.\n\n---\n\n**Summary:**\n• Minimum threshold: **$100 USD**\n• How to withdraw: Click **"Request Withdrawal"** on the **[Wallets](/wallets)** page\n• Processing: Manually every **Monday**\n• Settlement: **5–7 business days** after Monday\n• Global payouts are handled manually for security and accuracy 🔒`,
  },

  /* ── WALLETS ── */
  {
    patterns: /wallet|deposit|withdraw|add.*fund|fund|money|pay(?:ment)?|transfer|balance/i,
    reply: `Player4Hire runs on **two separate wallets** — here's the full breakdown 💸\n\n🔵 **Hiring Wallet** — fund this to hire gamers\n• Deposit via **Razorpay** (UPI, GPay, PhonePe, Paytm, cards…)\n• Min deposit: **$10.75** | Max wallet balance: **$1,000**\n• **Cannot be withdrawn** — only spent on game sessions and tips\n\n🟢 **Earnings Wallet** — where your gamer income lands\n• Earn **90%** of every accepted bid when the session completes (10% platform fee)\n• Earnings are credited **immediately** after session completion + both reviews submitted\n• Once your balance hits **$100 USD** → a **"Request Withdrawal"** button appears\n• Click it to submit your request — payouts are processed **manually every Monday**\n• ⏱️ Funds arrive in your account within **5–7 business days** after Monday processing\n\n🔒 The moment a bid is accepted, funds lock into **escrow** — safe and untouchable by either side until the session is done.\n\nHead to **[Wallets](/wallets)** or **[Add Funds](/add-funds)** to get started! 💪`,
  },

  /* ── GETTING STARTED / NEW USER FLOW ── */
  {
    patterns: /getting.*start|new.*user|new.*here|where.*start|how.*begin|first.*step|just.*signed.*up|just.*registered|what.*do.*first|how.*join|how.*sign.*up|full.*flow|full.*process|complete.*process|whole.*process|step.*step/i,
    reply: `Welcome to Player4Hire! 🎮 Here's the **complete new-user journey** from signup to getting hired:\n\n**1️⃣ Create your account**\nSign up free at [/signup](/signup) — takes 30 seconds.\n\n**2️⃣ Link a gaming account**\nGo to your **[Profile](/profile)** → "Gaming Accounts" → connect Steam, Epic, PSN, Xbox, or Switch. Keep it public during review.\n\n**3️⃣ Wait for verification (24–48 hours)**\nOur team manually reviews your gaming account. You'll see a "Verification In Progress" banner on your Dashboard. Once approved, you get your ✅ Verified badge.\n\n**4️⃣ Pay the one-time activation fee**\nAfter verification, a prompt appears on your Dashboard. Pay a small one-time fee to fully unlock the platform:\n🌍 **Global → $5 USD** · 🇮🇳 **India → ₹149**\nThis is paid **once only** — never charged again. It protects against fake/bot accounts and keeps our community trustworthy.\n\n**5️⃣ Complete your profile**\nAdd your bio, profile photo, and at least 2 solo gallery photos. A complete profile builds trust and gets more hires.\n\n**6️⃣ Start posting or bidding!**\n• **Hirers:** Top up your Hiring Wallet (min ~$10.75 / ₹900) → Post a Request\n• **Gamers:** Browse open requests → Place a Bid → Get accepted → Play → Get paid!\n\nThat's the full flow. Any step you need help with? Just ask! 💪`,
  },

  /* ── ACTIVATION FEE ── */
  {
    patterns: /activation.*fee|activate.*account|one.?time.*fee|one.?time.*payment|₹149|\$5.*activat|account.*activat|why.*fee.*activat|need.*pay.*activat|how.*activat|account.*locked|unlock.*account/i,
    reply: `⚡ **Account Activation Fee — One Time Only**\n\nAfter your gaming account is **verified** (24–48 hrs after linking), you'll see an Activation prompt on your Dashboard.\n\n**Why do we charge this?**\nTo keep Player4Hire **safe and enjoyable for real gamers**, we charge a small one-time activation fee. Unfortunately, some bad actors create fake or bot accounts to abuse the platform. This small fee helps us greatly reduce spam and maintain a **high-quality, trustworthy community**.\n\n**Pricing (one-time only — never charged again):**\n🌍 **Global** → **$5 USD** (~₹420 INR)\n🇮🇳 **India** → **₹149**\n\n**What it unlocks:**\n• 📋 Post hiring requests\n• 💰 Place bids on open requests\n• 🤝 Full access to sessions, chat & earnings\n\n**Region is set automatically** — phone starting with +91 or Indian IP → India pricing. Otherwise Global.\n\nThank you for understanding and for helping us build a better gaming community together. ❤️\n\nPay on your **[Dashboard](/dashboard)** after verification. ✅`,
  },

  /* ── PLATFORM FEE ── */
  {
    patterns: /fee|commission|percent|10%|platform.*cut|how much.*charge/i,
    reply: `Totally fair question — here's exactly how it works 💰\n\nWe take a **flat 10% platform fee** on every completed session and every tip. That's it — no hidden charges.\n\n• **Hirer pays** the full agreed bid amount\n• **90% goes to the gamer** straight into their Earnings Wallet 💸\n• **10% goes to Player4Hire** — covers platform costs, payment protection & support\n\n**Example:** Gamer bids $20 → Hirer pays $20 → Gamer receives **$18.00** ✅\n\n**Tips/Gifts** follow the same 90/10 split — 90% goes to the gamer, 10% platform fee.\n\n**Example tip:** Hirer tips $10 → Gamer receives **$9.00** 🎁\n\nNo surprises, no fine print. Flat 10% on sessions and tips.`,
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
    reply: `Player4Hire has its own XP system and it slaps 🔥\n\n**+50 points** every time you complete a session and leave a review. Both hirer and gamer earn 50 pts.\n\nPoints level up your **Trust Factor** and profile rank — higher rank = better visibility = more hirers choosing YOU.\n\nSpend points in the **Points Shop** (Steam-style) on your **Profile page**:\n• 🎨 **Profile backgrounds** — unique gradient themes\n• 🏷️ **Custom titles** — shown under your name (e.g. "Elite Carry", "Chill Coach")\n• These are **Phase 1 live** — you can buy and equip them right now!\n\nCheck your points balance and current rank on your **[Profile](/profile)** page. Time to stack those sessions! 💪`,
  },

  /* ── TRUST CARD SYSTEM ── */
  {
    patterns: /trust.?card|trust.*tier|grey.*card|yellow.*card|blue.*card|gold.*card|trust.*badge|tier.*trust|reputation.*tier|card.*tier|what.*trust.*card|trust.*level|trust.*rank|♦|diamond.*badge|how.*trust.*work|improve.*trust|raise.*trust/i,
    reply: `🃏 **Trust Card System — Your Reputation Tier**\n\nEvery Player4Hire account has a **Trust Card** that reflects how much the community trusts you. It's shown as a ♦ colored badge next to your name everywhere on the platform.\n\n**Four tiers based on Trust Factor (0–100):**\n\n♦ **Grey Card** (Trust Factor 0–25)\nNew or inactive account. Build trust by completing your profile and doing sessions.\n\n♦ **Yellow Card** (Trust Factor 26–50)\nDefault starting range. Most new verified users begin here. Complete your profile and get a few great reviews to climb fast.\n\n♦ **Blue Card** (Trust Factor 51–75)\nTrusted member. You've completed sessions, earned good reviews, and built a solid presence.\n\n♦ **Gold Card** (Trust Factor 76–100)\nElite status. Gold-tier gamers and hirers are the most trusted on the platform — hirers actively prefer Gold card bidders.\n\n**How to climb your Trust Card tier:**\n• ✅ Complete your profile (photo, bio, gaming account, country, gender)\n• ⭐ Complete sessions and earn high ratings (9–10 earns extra trust points)\n• 🎮 Link your gaming accounts\n• 📸 Add a profile photo\n• 📧 Verify your email + phone\n• 🔁 Avoid strikes and bad reviews\n\nYour current Trust Factor is shown on your **[Profile](/profile)** page. Keep it high! 🏆`,
  },

  /* ── PROFILE COMPLETION BAR ── */
  {
    patterns: /profile.*complet|complete.*profile|profile.*bar|complet.*bar|what.*missing.*profile|profile.*percent|finish.*profile|profile.*score|profile.*progress/i,
    reply: `📊 **Profile Completion Bar**\n\nYour profile has a **completion bar** at the top of your **[Profile page](/profile)** that shows how complete your account is — and nudges you toward the next Trust Card tier.\n\n**7 fields tracked:**\n1. 📸 Profile photo\n2. ✍️ Bio\n3. 🎮 Gaming account linked\n4. 📧 Email verified\n5. 📱 Phone verified\n6. 🌍 Country set\n7. 👤 Gender set\n\nEach completed field increases your completion percentage. A fully complete profile:\n• Unlocks more hirer trust — hirers are far more likely to accept bids from complete profiles\n• Helps your Trust Card tier climb faster\n• Shows the community you're a serious, real player\n\nClick any missing item in the bar to jump straight to that section of your profile and fill it in! The bar also shows exactly how many more trust points you need to reach the next card tier (Grey → Yellow → Blue → Gold). 💪`,
  },

  /* ── STRIKE SYSTEM ── */
  {
    patterns: /strike|account.*strike|get.*strike|what.*strike|3.*strike|ban.*strike|why.*banned|account.*flag|flagged.*account|suspend|account.*suspend/i,
    reply: `⚠️ **Strike System — Account Warnings**\n\nPlayer4Hire uses a **3-strike system** to handle bad actors and policy violations.\n\n**What earns a strike:**\n• Confirmed harassment, threats, or toxic behavior\n• Submitting fake or fraudulent reviews\n• Ghosting confirmed sessions without cancellation\n• Repeated platform policy violations reported by multiple users\n\n**What happens when you receive a strike:**\n• ⚡ **1 strike** — Formal warning. Your Trust Factor drops by 10 points automatically.\n• ⚡⚡ **2 strikes** — Second warning. Another -10 Trust Factor. Yellow or Grey card tier likely.\n• ❌ **3 strikes** — Account flagged for **permanent ban review** by the admin team.\n\n**Strikes are issued by our admin team** after reviewing reports. They are not automatic — every strike involves manual review.\n\n**To avoid strikes:**\n• Always honor confirmed sessions\n• Keep all communication professional\n• Never attempt to submit fake reviews\n• Follow the community guidelines at all times\n\nIf you believe a strike was issued in error, contact our support team via the **[Community tab](/community)** or the report system. 📋`,
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

  /* ── GAMING ACCOUNT CONNECTIONS — Phase 1 LIVE ── */
  {
    patterns: /gaming.*account|connected.*account|link.*steam|link.*epic|link.*psn|link.*xbox|link.*switch|steam.*connect|epic.*connect|psn.*connect|xbox.*connect|nintendo.*connect|verify.*gaming|gaming.*profile.*trust|connect.*gaming|account.*badge|platform.*badge|bid.*trust|trust.*bid/i,
    reply: `**Connected Gaming Accounts** are live on Player4Hire right now! 🎮✅\n\nAs a gamer, linking your accounts builds instant trust with hirers — they can see at a glance which platforms you actually play on.\n\n**Platforms you can connect:**\n• 🖥️ **Steam** — links to your Steam profile\n• ⚡ **Epic Games**\n• 🎮 **PlayStation Network (PSN)**\n• 🟢 **Xbox**\n• 🔴 **Nintendo Switch**\n\n**How it shows up:**\n• Small coloured badges appear on your **bid card** — every hirer reviewing bids can see them instantly\n• They also appear on your **full profile** page\n• Hirers browsing bids immediately see which platforms you're verified on\n\n**Why it matters:**\nConnected accounts prove you're a real, active gamer — not just an account. Hirers feel far more confident accepting a bid from someone with a linked Steam or PSN profile.\n\n**How to connect:**\n1. Go to your **[Profile](/profile)** page\n2. Scroll to **"Gaming Accounts"**\n3. Click any platform → enter your username → hit Connect ✔️\n\n🌟 Linking a gaming account also adds **40 points** to your Profile Power score. Don't skip it — it's one of the biggest trust signals on your bid card!`,
  },

  /* ── STREAMING CONNECTIONS — Phase 1 LIVE ── */
  {
    patterns: /twitch|youtube.*gaming|kick.*stream|stream.*connect|connect.*account|link.*stream|streaming.*platform|streaming.*channel|link.*channel|connect.*channel|facebook.*gaming|tiktok.*live/i,
    reply: `**Streaming channel connections** are **live right now** in Phase 1! 🎉\n\nYou can link any of these platforms to your Player4Hire profile:\n• 🟣 **Twitch**\n• ▶️ **YouTube Gaming**\n• 🟢 **Kick**\n• 🔵 **Facebook Gaming**\n• 🎵 **TikTok Live**\n\n**How to connect:**\n1. Go to your **[Profile](/profile)** page\n2. Scroll down to the **"Streaming Channels"** section\n3. Click any platform → enter your username → hit Connect\n\n**What linking does:**\n• Your channels appear on your profile for hirers to see\n• Connected channels show on your **bid cards** — hirers can click through to your channel\n• Hirers can use the **"Has Streaming"** filter when reviewing bids to find streamers specifically\n• Adds 40 points to your **Profile Power** score\n\nYou can connect, update, and disconnect accounts any time from your profile! 🔗`,
  },

  /* ── COMMUNITY — LIVE ── */
  {
    patterns: /community|suggest|idea|feature.*request|vote|upvote|downvote|comment.*community|community.*comment|gif.*community|emoji.*community|community.*tab|community.*page/i,
    reply: `**Community** is live on Player4Hire! 🎉 Find it in the navigation bar — it's the space where players shape what gets built next.\n\n**What you can do:**\n• 💡 **Post suggestions** — feature requests, bug reports, UI ideas, or anything else\n• 👍 **Like / 👎 Dislike** any suggestion (one vote per user, toggle to remove)\n• 💬 **Comment & reply** in threaded conversations\n• 😄 **Emoji picker** — tap the smiley button to drop any emoji in your comment\n• 🎬 **GIF support** — tap the GIF button to search and embed a reaction GIF\n• 🌍 **Nationality flags** — every commenter shows their country flag + username + timestamp\n\n**When posting:**\n• Pick a category: Feature Request, Bug Report, UI Improvement, or Other\n• External links are automatically removed for community safety\n• You'll see a warning if your text contained a link\n\n**Admin moderation** (admin-only):\n• Approve, Hide, or Delete any post — visible only to the platform admin\n\nGo voice your ideas — the most upvoted suggestions get prioritised! 🚀`,
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

  /* ── MULTI-LANGUAGE / LANGUAGE SUPPORT ── */
  {
    patterns: /language|multi.?lang|hindi|spanish|french|german|portuguese|español|deutsch|français|português|हिन्दी|translate|translation|other.*language|language.*support|change.*language|switch.*language/i,
    reply: `🌍 **Multi-language support is coming to Player4Hire!**\n\nWe're actively working on adding full support for:\n\n• 🇮🇳 **Hindi** — हिन्दी\n• 🇪🇸 **Spanish** — Español\n• 🇫🇷 **French** — Français\n• 🇩🇪 **German** — Deutsch\n• 🇵🇹 **Portuguese** — Português\n• ...and more!\n\n**Right now**, the site is available in **English only** — but we've already built the language selector into the navbar (top right, globe icon 🌐). Click any language to see what's coming!\n\n**Why it matters:** Player4Hire is a global platform with players from every corner of the world — we want everyone to feel at home. Multi-language support is a top priority for Phase 2.\n\nThank you for your patience! We'll announce when each language goes live in the **[Community](/community)** tab 💬`,
  },

  /* ── PHASE 2+ FEATURES — accurate catch-all ── */
  {
    patterns: /community.*suggest|suggest.*feature|feature.*request|emoji.*comment|gif.*comment|light.*dark|dark.*light|theme.*toggle/i,
    reply: `That feature is part of our phased rollout — coming soon! 🔜\n\nWe're building Player4Hire phase by phase to make sure everything works perfectly before unlocking more.\n\n**Right now — Phase 1 (Live):**\n✅ Account creation + gaming account linking (24–48hr verification)\n✅ **One-time activation fee** after verification (🇮🇳 ₹149 India / 🌍 $5 Global — once only, never again)\n✅ Unique GB-XXXXXX User ID with copy button\n✅ Profile photos — 1 main + min 2 solo (max 4), anti-AI warning, duplicate detection\n✅ Regional minimum fees — ₹200/hr India · $5 USD/hr international\n✅ Request posting, bidding & full session management\n✅ Simple in-app messaging for Discord username exchange\n✅ Dual wallets + 10% platform fee (escrow-held)\n✅ Manual payout system — $100 threshold, admin approves every Monday\n✅ Reviews, Trust Factor, Verified badge & connected gaming accounts\n✅ Optional gender preference filter\n✅ Community tab — voting, suggestions, GIF/emoji comments\n✅ Community Guidelines & full 7-section Disclaimer\n\n**Phase 2 (Coming Soon):**\n🔜 Tournaments — free to join, hirer approves participants\n🔜 Bulk Hiring (3–100 gamers in one request)\n🔜 Automatic Payouts — instant when threshold is hit\n🔜 Advanced Real-Time Features — live notifications & bid updates\n\n**Phase 3 (Future):**\n🔵 Full mobile app enhancements\n🔵 Game dev & publisher partnerships\n🔵 Advanced AI, stronger security\n\nCheck the **[Roadmap](/roadmap)** for all the details! 🗺️`,
  },

  /* ── ROADMAP / FUTURE FEATURES ── */
  {
    patterns: /roadmap|future.*feature|what.*coming|upcoming|phase|whats.*next|next.*update|coming.*soon|release|plan.*feature|feature.*plan/i,
    reply: `**Player4Hire Roadmap** 🗺️\n\n✅ **Phase 1 — Live Now**\n• Account creation + gaming account linking — **24–48 hour verification**\n• Unique **GB-XXXXXX User ID** with one-click copy button\n• Profile photos — 1 main + min 2 real solo photos (max 4), anti-AI warning, duplicate detection\n• Regional minimum fee — **₹200/hr India · $5 USD/hr international**\n• Request posting, bidding & full session management\n• Simple in-app messaging (for exchanging Discord usernames & voice chat details)\n• Dual Wallets — Hiring + Earnings, with $100 withdrawal threshold\n• 10% platform fee + escrow protection\n• Manual payout system — Request Withdrawal button, admin approves & marks Paid every Monday\n• Reviews, Trust Factor & Verified badge\n• Connected gaming accounts displayed (Steam, Epic, PSN, Xbox, Switch)\n• Optional gender preference filter on requests\n• Community tab — voting, suggestions, GIF/emoji comments\n• Community Guidelines & Behavior Rules\n• Professional 6-section Disclaimer with funds-holding note\n\n🔜 **Phase 2 — Coming Soon**\n• Tournaments — free to join, hirer approves every participant\n• Bulk Hiring (3–100 gamers in one request)\n• Automatic Payouts — instant processing when threshold is hit\n• Advanced Real-Time Features — live notifications, bid updates, instant messaging\n\n🔵 **Phase 3 — Future**\n• Full mobile app enhancements\n• Game developer & publisher partnerships\n• Advanced AI features\n• Stronger security & fraud detection\n\nFull details on the **[Roadmap page](/roadmap)**! 🗺️`,
  },

  /* ── COMMUNITY (PHASE 1 LIVE — catch-all for emoji/gif/suggestion queries) ── */
  {
    patterns: /community|suggest|suggestion|feedback.*platform|emoji|gif|reaction|flag.*comment/i,
    reply: `**Community is live on Player4Hire!** 🎉 Check the **[Community tab](/community)** in the navbar.\n\n**What you can do right now:**\n• 💡 Post feature requests, bug reports, UI ideas — pick a category\n• 👍 Upvote / 👎 Downvote any suggestion (one vote per user, toggle to remove)\n• 💬 Threaded comments with replies\n• 😄 Emoji picker in comments\n• 🎬 GIF support — search and embed Tenor GIFs\n• 🌍 Country flags shown next to every username\n\nYour votes and suggestions directly shape what gets built next — the most upvoted ideas get prioritised! 🚀`,
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
    reply: `**Tips & Gifts** 🎁 — available in Phase 1!\n\nAfter a session completes (or enters the review stage), hirers can tap the **Gift / Tip** button to send a bonus directly to the gamer.\n\n• 💸 **90% of the tip goes to the gamer** — same 10% platform fee applies\n• **Example:** Tip $10 → Gamer receives **$9.00** ✅\n• Deducted from your **Hiring Wallet**\n• Shows as a separate "Tip Received" entry in the gamer's transaction history\n\nA great way to reward a gamer who went above and beyond! Find the Gift button on the **Request Detail** page once the session wraps.`,
  },

  /* ── VOICE CHAT / DISCORD ── */
  {
    patterns: /voice|discord|mic|jitsi|voice.*chat|voip|call|talking/i,
    reply: `**Voice Coordination** 🎙️\n\nPlayer4Hire doesn't have built-in voice chat right now — but here's the standard flow:\n\n1. Once a bid is accepted, use the **private chat** to share your **Discord tag**\n2. Add each other on Discord and jump in a voice channel\n3. Coordinate start time, strategy, and objectives before the session begins\n\n🔑 **Always let the hirer decide** if they want voice or text-only — some players prefer no mic. Respecting this is part of the **Gamer Code of Conduct** — violations can be reported.\n\nBuilt-in voice/Jitsi integration is being evaluated for a future phase. For now, Discord is the go-to! 🎧`,
  },

  /* ── RECORDING ── */
  {
    patterns: /record|stream.*session|capture|obs|clip/i,
    reply: `**Recording Sessions** 📹\n\nRecording is **entirely optional** and the responsibility of the person doing it.\n\n• Player4Hire does not record sessions on your behalf\n• If you plan to record or stream, **tell the other party before starting** — consent is key\n• Surprise recording without consent is a violation of the Code of Conduct and can be reported\n\nSimple rule: communicate first, record second. ✅`,
  },

  /* ── OFF-PLATFORM / DIRECT DEALS ── */
  {
    patterns: /off.platform|outside.*platform|pay.*directly|direct.*pay|pay.*outside|deal.*outside|outside.*deal|skip.*escrow|bypass.*platform|move.*deal|cash.*deal|bank.*transfer.*direct|avoid.*fee|direct.*transfer/i,
    reply: `💡 **Staying on Player4Hire is always the safest and simplest choice!**\n\nAll payments here go through our secure **escrow system** — it protects both hirers and gamers throughout the session.\n\nWe recommend keeping all arrangements and payments on the platform because:\n• 🛡️ Your funds are held safely in escrow until the session is properly completed\n• ✅ Both parties have clear protections, a full chat history, and a review process\n• 💬 Everything — chat, session flow, and payment — is in one place, making it simple and stress-free\n\nIf someone suggests moving money or arrangements off the platform, it's generally best to politely decline and use Player4Hire's built-in tools instead. It's the easiest and safest path for everyone involved 😊\n\nIf you feel pressured by another user, tap the 🚩 **Report** button on their profile — our team will look into it.`,
  },

  /* ── SAFETY / PASSWORDS ── */
  {
    patterns: /password|account.*shar|never.*share|security|scam|phish|login.*detail/i,
    reply: `🚨 **Hard stop — this is the #1 safety rule on Player4Hire:**\n\n**NEVER share your account password.** Not Steam. Not Epic. Not PlayStation. Not Xbox. Not your Player4Hire account. Nothing.\n\nReal verified gamers will **never** ask for your login. If anyone does:\n1. Say no\n2. Hit the 🚩 **Report** button and flag them immediately\n\n**Also watch out for:**\n• Anyone suggesting payment outside Player4Hire (PayPal, gift cards, bank transfer) — you'd lose your escrow protection\n• Fake profiles with no verification badge\n• Suspiciously low bids with pressure to "pay me directly"\n\nAll payments on Player4Hire are protected by escrow. Staying on the platform is always the safest choice for everyone 🛡️`,
  },

  /* ── YOU CANNOT HIRE YOURSELF ── */
  {
    patterns: /hire.*myself|bid.*own|self.*hire|own.*request/i,
    reply: `You **cannot hire yourself** on Player4Hire 🚫\n\nThe platform prevents placing a bid on your own request. This is a built-in safeguard to ensure fair competition and genuine transactions between different users — we check this at the API level, not just the UI.`,
  },

  /* ── SUPERR.BIO / ALL LINKS ── */
  {
    patterns: /superr\.bio|linktree|link.*bio|bio.*link|all.*social|all.*link|every.*platform|find.*everything|one.*link/i,
    reply: `The easiest way to find everything Player4Hire is our link-in-bio page! 🔗\n\n**[👉 superr.bio/gamerbuddy](https://www.superr.bio/gamerbuddy)**\n\nIt's our central hub — one link with all our platforms, Discord server, social channels, and everything else in one place. Bookmark it! 🚀`,
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

  /* ── CONTACT OTP VERIFICATION (Email + Phone) ── */
  {
    patterns: /email.*verif|verif.*email|otp|one.*time.*pass|email.*code|verify.*email|email.*otp|email.*trust|phone.*verif|verif.*phone|sms.*verif|verif.*sms|verify.*contact|contact.*verif/i,
    reply: `🔐 **Contact Verification** — a quick optional step that boosts your Trust Factor!\n\nYou can verify via **Email** (available now) or **Phone/SMS** (India +91 first, coming soon).\n\n**How Email Verification works:**\n1. Go to your **[Profile](/profile)** page\n2. Scroll to the **"Verify Your Contact"** card\n3. Choose **Email** tab → Click **"Send Code to Email"**\n4. Enter the 6-digit code from your inbox (valid for 10 minutes)\n5. Done! Your profile gets a green ✅ **Email Verified** badge + **+5 Trust Factor**\n\n**Phone / SMS Verification (coming soon):**\n• India users (+91) will be first to get SMS OTP verification\n• International numbers supported shortly after\n• When available: choose **Phone** tab → enter your mobile number → verify the SMS code\n\n**Security details:**\n• 3 attempts per OTP before it's invalidated\n• Max 3 codes per hour per contact\n• Fully optional — but strongly encouraged!\n\n**Why verify?**\n• 📈 **+5 Trust Factor** added instantly\n• 🛡️ Shows hirers you're a real person, not a fake account\n• 🔒 Reduces platform fraud and keeps everyone safe\n\nVerifying via email takes under 60 seconds — try it now! 🚀`,
  },

  /* ── VERIFICATION / BADGE ── */
  {
    patterns: /verif|badge|trust.*factor|id.*check|how.*long.*verify|green.*tick/i,
    reply: `Verification unlocks posting and bidding on Player4Hire — and it's fast! ✅\n\n**How to get verified (~24 hours):**\n1. Go to your **[Profile](/profile)** page\n2. Scroll to **"Gaming Accounts"**\n3. 🎮 Click any platform — **Steam, Epic, PSN, Xbox, or Nintendo Switch**\n4. Enter your username/gamertag and hit **Connect**\n5. Keep that gaming account **Public** so we can verify real activity\n6. We review within **24 hours** → Green badge appears! 🎉\n\n**Also available — Contact Verification (optional, instant):**\n• Profile → scroll to **"Verify Your Contact"**\n• Choose Email (instant) or Phone/SMS (coming soon for India +91)\n• Enter the 6-digit code → get **+5 Trust Factor** + a verified badge immediately! 🔐\n\n**Badge meanings:**\n• 🟡 **Under Review** — gaming account linked, review in progress\n• 🟢 **Gaming Verified** — fully reviewed, trust established\n• ✉️ **Email Verified** — email confirmed via OTP\n\n🌟 **Pro tip:** Stack all verifications — gaming account + email — for the highest trust and most bids! 🚀`,
  },

  /* ── PROFILE COMPLETION ── */
  {
    patterns: /profile.*complet|complet.*profile|finish.*profile|setup.*profile|profile.*setup|fill.*profile|profile.*fill|bio|about.*me|my.*profile/i,
    reply: `**Profile Completion** ✨ — the secret weapon for getting more bids!\n\nOnce your account is verified, we **strongly recommend** filling out every section of your profile. Here's why it matters and what to add:\n\n**1. ✍️ Bio (30% of profile score)**\nWrite a short intro about yourself — your gaming style, favorite genres, and what kind of sessions you enjoy. Hirers read this before accepting bids!\n\n**2. 🌍 Region & Gender (30%)**\nSet your country and gender so hirers can filter specifically for you. This is huge for getting matched to the right requests.\n\n**3. 🔗 Connected Gaming Accounts (40%)**\nLink your Steam, Epic, PlayStation, Xbox, or other accounts on your profile. It proves you're a real, active gamer — builds serious trust.\n\n**Progress bar 📊**\nYour profile has a built-in completion tracker — it shows your score out of 100% and highlights exactly what's missing. Aim for 80%+ to unlock the **Trust badge**.\n\n**After verification**, you'll see a "Finish Your Profile" banner on your Dashboard and profile page guiding you through each step. It takes less than 2 minutes — and the payoff in better matches is worth every second! 💪`,
  },

  /* ── TRUST SCORE + TRUST FACTOR ── */
  {
    patterns: /trust.*score|trust score|trust.*point|unlimited.*trust|trust.*unlimited/i,
    reply: `**Trust Score** 🛡️ — the unlimited reputation counter!\n\nUnlike Trust Factor (which caps at 100), your **Trust Score has no maximum limit**. The more you contribute, the higher it goes — forever.\n\n**Earn +5 Trust Score for:**\n• ✅ Completing a session + receiving a review\n• ⭐ Getting a high rating (9–10/10) — extra +5 on top!\n• 🎮 Linking your first gaming account (Steam, PSN, Xbox, etc.)\n• 📸 Uploading your real profile photo for the first time\n• 🤝 Maintaining good community behavior\n\n**Why it matters:**\n• A higher Trust Score = better visibility in bids\n• Hirers see your score when comparing candidates\n• There is no cap — a score of 500, 1000, 2000 is all possible\n• The more you contribute, the more trustworthy and desirable you become\n\nYour Trust Score is shown prominently on your **[Profile](/profile)** page. Start stacking! 🚀`,
  },
  /* ── TRUST FACTOR ── */
  {
    patterns: /trust|trust.*factor|reputation|credib/i,
    reply: `**Trust System** 🛡️ — two layers of reputation on Player4Hire:\n\n**1. Trust Score (unlimited)**\nEarns +5 points for specific actions — no maximum cap:\n• ✅ Completing a session + receiving a review (+5, or +10 for a 9–10 rating)\n• 🎮 Linking your first gaming account\n• 📸 Uploading your real profile photo\n• 🤝 Good community behavior\n\nYour Trust Score can grow to 500, 1000, or beyond — the higher it is, the more visible and desirable your profile becomes.\n\n**2. Trust Factor (0–100)**\nA composite formula-based score:\n• ⭐ Bayesian average of all your review ratings\n• 🎮 Total sessions completed (sqrt-scaled, caps at 50)\n• 📊 Review volume (up to 10 reviews)\n• 👍 Community vote sentiment\n\nBoth scores are shown on your profile. The fastest way to grow both: **complete sessions + earn great reviews**! Every session counts 🔥`,
  },

  /* ── CONTACT / SUPPORT ── */
  {
    patterns: /contact.*support|support.*email|email.*support|reach.*support|reach.*team|how.*contact|email.*us|email.*team|contact.*us|get.*in.*touch|how.*reach|reach.*you/i,
    reply: `You can find all our social links, Discord, and community in one place by clicking the **"Social"** tab in the navigation. 🔗\n\nThis is the best way to connect with us — every platform, direct community access, all in one place!`,
  },

  /* ── ROADMAP / WHAT'S COMING ── */
  {
    patterns: /roadmap|what.*coming|feature.*coming|coming soon|what.*next|phase.*2|phase.*3|future.*feature|upcoming/i,
    reply: `Here's the full Player4Hire roadmap! 🗺️\n\n✅ **Phase 1 — Live Now (all of these are available today):**\n• User registration with gaming account linking + **24–48 hour verification**\n• **One-time account activation fee** after verification — 🌍 $5 Global / 🇮🇳 ₹149 India (once only, never again)\n• Unique **Player4Hire ID (GB-XXXXXX)** with one-click copy button\n• Profile photos — 1 avatar + min 2 solo photos, anti-AI enforcement, no duplicates\n• Regional minimum hiring fee — **₹200/hr India · $5/hr international**\n• Request posting, bidding, and full session management\n• In-app private messaging between hirer and gamer\n• Dual Wallets + 10% platform fee (escrow-held until session complete)\n• Manual payout system — $100 threshold, admin-processed within 24–48 hours\n• Reviews, Trust Factor score & Verified badge\n• Connected gaming accounts display (Steam, Epic, PSN, Xbox, Switch)\n• Optional gender preference filter on requests\n• Community tab with voting, suggestions, GIF/emoji comments\n• Full Community Guidelines & Behavior Rules (respect, no NSFW, fair play)\n• Professional 7-section Disclaimer with funds-holding note\n\n🔜 **Phase 2 — Coming Soon:**\n• 🏆 **Tournaments** — free to join, hirers approve participants, country/region/gender filters\n• 👥 **Bulk Hiring** — hire 3 to 100 gamers in a single request\n• 💸 **Automatic Payouts** — instant processing when threshold is hit\n• ⚡ **Advanced Real-Time Features** — live notifications, bid updates, and instant messaging improvements\n\n🚀 **Phase 3 — Future:**\n• Advanced AI Support improvements\n• Game Dev Partnerships & promoted games\n• Stronger security & fraud detection tools\n• Full mobile app enhancements\n\nVote on what gets built first in the **[Community](/community)** tab — your votes directly shape the priority! 💡`,
  },

  /* ── GENERAL HELP ── */
  {
    patterns: /help|support|question|how.*work|what.*is.*gamerbuddy|about.*platform/i,
    reply: `**Player4Hire** is a global gaming marketplace — hire skilled gamers for co-op, ranked sessions, raids, and more across PC, PlayStation, Xbox, Switch, Steam Deck, and Mobile 🎮\n\n**Phase 1 is fully live — all of this is available right now:**\n• User registration + **24–48hr verification** (gaming account review)\n• **One-time activation fee** after verification — 🌍 $5 Global · 🇮🏿🏿 ₹149 India (once only)\n• Unique **GB-XXXXXX ID** for every user with copy button\n• Profile photos — avatar + min 2 solo photos, anti-AI enforced\n• Regional minimum fees — **₹200/hr India · $5/hr international**\n• Request posting, bidding & full session management\n• In-app private messaging between hirer and gamer\n• **Dual Wallets** + 10% platform fee (escrow-held)\n• **Manual payout system** — $100 threshold, processed within 24–48 hours\n• Reviews, Trust Factor & Verified badge\n• Connected gaming accounts display (Steam, Epic, PSN, Xbox, Switch)\n• Optional gender preference filter on requests\n• Community tab — voting, suggestions, GIF/emoji comments\n• Community Guidelines & Behavior Rules (respect, no NSFW, fair play)\n• Professional 7-section Disclaimer with funds-holding note\n\n**Phase 2 (Coming Soon):** Tournaments, Bulk Hiring (3–100 gamers), Automatic Payouts, Advanced Real-Time Features\n**Phase 3 (Future):** Advanced AI, Game Dev Partnerships, Stronger Security\n\nFor anything beyond what I can answer, click the **"Social"** tab to reach all our links. 🔗\n\nAsk me about any feature and I'll give you the full breakdown!`,
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
      .replace(/`(.*?)`/g, "<code style='font-size:11px;background:rgba(212,255,0,0.15);padding:1px 4px;border-radius:4px'>$1</code>");
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
      text: "Yo! 👾 I'm **Buddy** — your Player4Hire support assistant, always online.\n\nWe're in **Phase 1** — the full core experience is live! To get started: sign up → link a gaming account → get verified (24–48hrs) → pay the one-time activation fee (🌍 $5 / 🇮🇳 ₹149) → start hiring or bidding!\n\nAsk me anything — wallets, escrow, fees, how to post a request, how to bid, safety rules, and more. Let's get you that W! 🎮",
    },
  ]);
  const [input, setInput]   = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-4 py-3 font-bold text-sm text-[#D4FF00] transition-all hover:scale-105 active:scale-95"
        style={{ background: "#1A1A1A", boxShadow: "0 2px 10px rgba(0,0,0,0.60)" }}
        aria-label="Open AI Support"
      >
        <div className="relative">
          <MessageSquare className="h-5 w-5 text-[#D4FF00]" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1A1A1A] animate-pulse" />
        </div>
        <span className="hidden sm:inline">AI Support</span>
      </button>
    );
  }

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        width: "clamp(320px, 90vw, 390px)",
        height: minimized ? "56px" : "clamp(420px, 70vh, 560px)",
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.75)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "#1A1A1A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1A1A1A]" />
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
                      ? { background: "rgba(212,255,0,0.15)", border: "1px solid rgba(212,255,0,0.3)" }
                      : { background: "rgba(212,255,0,0.15)", border: "1px solid rgba(212,255,0,0.3)" }
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
                      ? { background: "rgba(212,255,0,0.08)", border: "1px solid rgba(212,255,0,0.15)", color: "rgba(255,255,255,0.88)" }
                      : { background: "rgba(212,255,0,0.12)", border: "1px solid rgba(212,255,0,0.2)", color: "rgba(255,255,255,0.92)" }
                  }
                >
                  {renderMarkdown(msg.text)}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "rgba(212,255,0,0.15)", border: "1px solid rgba(212,255,0,0.3)" }}>
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,255,0,0.08)", border: "1px solid rgba(212,255,0,0.15)" }}>
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
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-bold text-[#D4FF00] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "#1A1A1A",
                border: "1px solid rgba(212,255,0,0.40)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.50)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              All Socials &amp; Links
            </a>
          </div>

          {/* Input */}
          <div className="px-3.5 pb-3.5 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(212,255,0,0.12)" }}>
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,255,0,0.2)" }}
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
                  ? { background: "rgba(212,255,0,0.25)", border: "1px solid rgba(212,255,0,0.4)", color: "#D4FF00" }
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
