import { Shield, Info, Gamepad2, AlertTriangle, CheckCircle2, Users, Lock, Star, Zap, Heart, CalendarDays } from "lucide-react";
import { Link } from "wouter";

const SECTIONS = [
  {
    number: "1",
    title: "Early Development Phase",
    icon: Zap,
    iconColor: "text-amber-400",
    content:
      "The Platform is currently in its early development stage. Features, functionality, security measures, and overall performance may be limited or subject to ongoing refinement. We make no representations or warranties regarding uninterrupted availability, completeness, or error-free operation. Users acknowledge and accept that technical issues or delays may occur as we continue to improve the service.",
  },
  {
    number: "2",
    title: "No Guarantee of Individual Performance",
    icon: Shield,
    iconColor: "text-purple-400",
    content:
      "Gamerbuddy is a matching platform only. We do not supervise, endorse, or guarantee the skill, reliability, punctuality, behavior, or performance of any Gamer or Hirer. All interactions and gaming sessions occur directly between the Hirer and the Gamer. We strongly encourage users to carefully review profiles, ratings, Trust Factor, past reviews, and Quest details before engaging with any individual. Users are solely responsible for their own due diligence and conduct during sessions.",
  },
  {
    number: "3",
    title: "Session Recording",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    content:
      "The Platform does not record any gaming sessions, including gameplay footage or voice communications. The responsibility for recording sessions lies entirely with the users. In the event of any dispute, complaint, or allegation arising from a session, if no recording has been made by the users, Gamerbuddy shall not be obligated or able to investigate, verify claims, mediate, or provide any form of resolution. Users are strongly advised to record their sessions using their own tools and software.",
  },
  {
    number: "4",
    title: "Platform Fee",
    icon: CheckCircle2,
    iconColor: "text-green-400",
    content:
      "A platform fee of ten percent (10%) shall be automatically deducted from the total amount of every successfully completed Quest or Job. The remaining ninety percent (90%) shall be credited to the Earnings Wallet of the hired Gamer. This fee is non-negotiable and supports the operation, maintenance, development, and security of the Platform.",
  },
  {
    number: "5",
    title: "Password and Account Security",
    icon: Lock,
    iconColor: "text-red-400",
    content:
      "Users are strictly prohibited from sharing their Steam, Epic Games, PlayStation, Xbox, Nintendo Switch, or any other gaming account passwords or login credentials with any other user on the Platform, irrespective of any offers or assurances provided. Gamerbuddy will never request such credentials under any circumstances. Any solicitation of passwords or login details constitutes a serious violation and will result in immediate account suspension.",
  },
  {
    number: "6",
    title: "Voice Communication",
    icon: Info,
    iconColor: "text-cyan-400",
    content:
      "Gamers must obtain explicit consent from the Hirer before initiating any form of voice communication, whether through Discord or in-game VoIP. Voice chat is never mandatory. Hirers retain absolute discretion to decline voice interaction or prefer text-only communication.",
  },
  {
    number: "7",
    title: "Account Verification",
    icon: CheckCircle2,
    iconColor: "text-purple-400",
    content:
      "Following submission of identification documents, phone number, and email address, the verification process may require between seven (7) and fifteen (15) days for completion. During this period, certain Platform features, including the ability to post requests or engage in hiring activities, may remain restricted until full verification is approved. We reserve the sole right to approve, request additional documentation, or reject verification applications.",
  },
  {
    number: "8",
    title: "Bulk Hiring",
    icon: Users,
    iconColor: "text-purple-400",
    content:
      "Bulk Hiring requests are permitted with a minimum of three (3) and a maximum of one hundred (100) gamers per session. All rules, fees, responsibilities, and safety protocols apply individually to each participant.",
  },
  {
    number: "9",
    title: "Promoted Games and Rewards",
    icon: Star,
    iconColor: "text-amber-400",
    content:
      "Participation in sessions involving Promoted or Spotlight Games may qualify users for additional rewards, including bonus points, free game keys, or complimentary session credits, subject to successful completion and Platform verification.",
  },
  {
    number: "10",
    title: "Limitation of Liability",
    icon: Shield,
    iconColor: "text-red-400",
    content:
      "To the maximum extent permitted by applicable law, Gamerbuddy, its owners, operators, affiliates, and representatives shall not be liable for any direct, indirect, incidental, consequential, special, or punitive damages arising from the use of the Platform, including but not limited to disputes between users, in-game losses, account penalties, technical failures, or any actions or omissions by individual users.",
  },
  {
    number: "11",
    title: "Platform Rights and Enforcement",
    icon: Shield,
    iconColor: "text-purple-400",
    content:
      "In any and all scenarios, Gamerbuddy reserves the absolute and unrestricted right to act as it deems necessary to protect the integrity, safety, security, and quality of the Platform. This includes, without limitation, the right to review reports, suspend or permanently terminate accounts, remove content, withhold funds, impose restrictions, or take any other measures we consider appropriate. We will strictly enforce our rules and policies without exception.",
  },
  {
    number: "12",
    title: "Minimum Hiring Fee",
    icon: Zap,
    iconColor: "text-green-400",
    content:
      "Gamerbuddy enforces a regional minimum hiring rate to ensure fair compensation for all Gamers. For Hirers based in India, the minimum fee is ₹350 (Indian Rupees) per hour of session time. For all other users — including those based in Europe, the United States, Canada, Australia, and all other countries — the minimum fee is $8 USD per hour. The minimum total for a session is calculated as: Number of Hours × Minimum Hourly Rate. Hirers are required to select their region (India or International) and specify session duration when posting a request. This minimum is displayed clearly on all request listings and in the bid panel. These rates are non-negotiable platform minimums designed to protect Gamers against exploitatively low offers and ensure that their time, skill, and effort are always fairly valued.",
  },
  {
    number: "13",
    title: "Profile Photos & Identity",
    icon: Heart,
    iconColor: "text-pink-400",
    content:
      "All users are required to upload a minimum of one (1) main profile picture and a minimum of two (2) additional photos on their profile. All photos must be genuine, real solo photographs of the account holder only. Group photos are strictly prohibited. AI-generated, digitally altered, fake, or stolen images are strictly prohibited and constitute a serious violation of Platform policy. Duplicate photo uploads (the same image submitted more than once) are blocked automatically. Profile photos are reviewed by our moderation team and must be submitted in good faith. Failure to comply — including the use of fake, AI-generated, or deceptive photos — may result in immediate account suspension and forfeiture of any pending earnings. Profile photos are displayed on bid cards, public profiles, and request listings to build trust and transparency between all users.",
  },
  {
    number: "14",
    title: "Earnings Wallet & Payout Policy",
    icon: CalendarDays,
    iconColor: "text-cyan-400",
    content:
      "Earnings are credited to a Gamer's Earnings Wallet immediately upon session completion and once both parties have submitted their mandatory reviews. For users based in India: withdrawals are processed instantly or same-day via Razorpay to the user's UPI ID or Indian bank account (GPay, PhonePe, Paytm, etc.), subject to a minimum withdrawal threshold of ₹8,300 (approximately $100 USD). For users outside India (including Europe, the United States, Canada, Australia, and all other countries): withdrawals are processed in a single weekly batch every Monday via Razorpay International Bank Transfer; funds typically arrive within 5–7 business days after the Monday batch is processed, subject to a minimum withdrawal threshold of $100 USD. Gamerbuddy does not guarantee specific settlement times as these are subject to third-party banking and payment provider timelines. The Hiring Wallet is a deposit-only wallet and cannot be withdrawn under any circumstances — funds therein may only be used to fund game session requests.",
  },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-16">

      {/* ── Hero ── */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center border border-primary/30"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.1) 100%)" }}
          >
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">About Gamerbuddy</h1>
            <div className="text-xs text-primary font-bold uppercase tracking-widest mt-0.5">Global Gaming Marketplace</div>
          </div>
        </div>

        {/* Thin accent bar */}
        <div className="h-px bg-gradient-to-r from-primary/60 via-secondary/40 to-transparent" />

        {/* Our Story CTA */}
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(34,211,238,0.07) 100%)",
            borderColor: "rgba(168,85,247,0.25)",
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.30)" }}
            >
              <Heart className="h-5 w-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: "#a855f7" }}>
                Founder's Note
              </p>
              <p className="text-sm text-muted-foreground leading-snug">
                Learn why this platform exists — and the game that quite literally saved the founder's life.
              </p>
            </div>
          </div>
          <Link
            href="/our-story"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white whitespace-nowrap transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)",
              boxShadow: "0 4px 20px rgba(168,85,247,0.35), 0 0 0 1px rgba(168,85,247,0.20)",
            }}
          >
            <Heart className="h-4 w-4" />
            Our Story
          </Link>
        </div>

        {/* About paragraphs */}
        <div className="space-y-4 text-foreground/80 leading-relaxed">
          <p>
            <span className="text-white font-semibold">Gamerbuddy</span> is a global marketplace designed to connect
            players who want to hire skilled and friendly gamers with those offering their services for co-op and
            multiplayer gaming sessions across{" "}
            <span className="text-primary font-medium">
              Steam, Epic Games, PlayStation, Xbox, Nintendo Switch, Steam Deck, iOS, and Android
            </span>
            .
          </p>
          <p>
            We believe gaming is better when you play with the right people. Our platform helps you find real
            teammates — without the frustration of toxic randoms or unreliable friends.
          </p>
          <p>
            The platform is currently in its{" "}
            <span className="text-amber-400 font-semibold">early development phase</span>. We are actively improving
            features, security, and user experience based on community feedback.
          </p>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap gap-2">
          {["Steam", "Epic Games", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"].map((p) => (
            <span
              key={p}
              className="text-xs font-bold border border-primary/20 bg-primary/5 text-primary/80 rounded-full px-3 py-1"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── Disclaimer header ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center border border-amber-500/30"
            style={{ background: "rgba(245,158,11,0.1)" }}
          >
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Disclaimer</h2>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mt-0.5">Last Updated: April 2026</div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-amber-500/40 via-amber-500/10 to-transparent" />

        {/* Preamble */}
        <div
          className="rounded-2xl border border-amber-500/20 p-5 text-sm text-foreground/75 leading-relaxed"
          style={{ background: "rgba(245,158,11,0.04)" }}
        >
          This Disclaimer forms an integral and binding part of the Terms of Service governing the use of the Gamerbuddy platform ("Platform", "we", "us", or "our").
          <br /><br />
          Gamerbuddy operates solely as an online intermediary marketplace that facilitates connections between Hirers seeking skilled gamers and Gamers offering co-op and multiplayer gaming sessions across various platforms.
        </div>
      </div>

      {/* ── Numbered sections ── */}
      <div className="space-y-4">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <div
              key={section.number}
              className="group rounded-2xl border border-white/6 p-5 space-y-3 transition-colors hover:border-primary/20"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-start gap-4">
                {/* Number + icon */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center border border-primary/25 font-black text-sm text-primary"
                    style={{ background: "rgba(168,85,247,0.1)" }}
                  >
                    {section.number}
                  </div>
                  <Icon className={`h-3.5 w-3.5 ${section.iconColor}`} />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-black text-white text-base leading-tight group-hover:text-primary transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Closing agreement ── */}
      <div
        className="rounded-2xl border border-primary/30 p-6 space-y-3"
        style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.15) 0%, rgba(10,0,20,0.5) 100%)" }}
      >
        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest">
          <Shield className="h-4 w-4" />
          Agreement
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          By using Gamerbuddy, you expressly agree to this Disclaimer and the Terms of Service. We reserve the right
          to modify this Disclaimer at any time, with or without prior notice. Your continued use of the Platform
          following any modifications constitutes your acceptance of the revised terms.
        </p>
        <div className="pt-1 text-xs text-primary/60 font-semibold uppercase tracking-wide">
          Gamerbuddy — Global Gaming Marketplace · April 2026
        </div>
      </div>

      {/* ── Socials CTA ── */}
      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(34,211,238,0.04) 100%)",
          borderColor: "rgba(168,85,247,0.22)",
          boxShadow: "0 0 30px rgba(168,85,247,0.08)",
        }}
      >
        <div
          className="shrink-0 h-14 w-14 rounded-2xl border flex items-center justify-center"
          style={{ background: "rgba(168,85,247,0.12)", borderColor: "rgba(168,85,247,0.30)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth={2.2} className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#a855f7" }}>
            Questions? We've Got You
          </p>
          <h3 className="text-lg sm:text-xl font-black text-foreground">
            Find us on every platform
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For support, questions, feedback, and community — visit our Socials hub. Everything in one place.
          </p>
        </div>
        <a
          href="https://www.superr.bio/gamerbuddy"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)",
            boxShadow: "0 4px 24px rgba(168,85,247,0.30)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
          All Socials &amp; Links
        </a>
      </div>
    </div>
  );
}
