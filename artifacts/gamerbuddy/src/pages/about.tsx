import { Shield, Info, Gamepad2, AlertTriangle, CheckCircle2, Users, Lock, Star, Zap, Heart, CalendarDays, Banknote, BookOpen, MessageSquare, Ban, EyeOff, Handshake, UserCheck } from "lucide-react";
import { Link } from "wouter";

const SECTIONS = [
  {
    number: "1",
    title: "Early Development Phase",
    icon: Zap,
    iconColor: "text-amber-400",
    content:
      "The Platform is in its early stage. Features and performance may be limited or under refinement. We make no warranties regarding uninterrupted service or error-free operation. Users acknowledge and accept that technical issues or delays may occur as we continue to improve the service.",
  },
  {
    number: "2",
    title: "No Guarantee of Individual Performance",
    icon: Shield,
    iconColor: "text-purple-400",
    content:
      "Player4Hire is a matching platform only. We do not supervise, endorse, or guarantee the skill, reliability, punctuality, behavior, or performance of any Gamer or Hirer. All sessions occur directly between users. We strongly encourage reviewing profiles, ratings, Trust Factor, photos, and past reviews before engaging.",
  },
  {
    number: "3",
    title: "Funds Holding and Payouts",
    icon: Banknote,
    iconColor: "text-cyan-400",
    content:
      "Funds in a Gamer's Earnings Wallet are held by Player4Hire until a withdrawal is requested and manually processed every Monday. Indian users usually receive payment within 1–2 business days after processing. International users should expect 5–7 business days. Player4Hire is not a bank, does not pay interest on held funds, and cannot guarantee specific settlement dates due to third-party banking timelines.",
  },
  {
    number: "4",
    title: "Session Recording and Disputes",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    content:
      "We do not record sessions. Users are responsible for recording their own gameplay and voice chat for their protection. In case of disputes without recordings, our ability to investigate is limited. We strongly advise all users to record their sessions using their own tools and software.",
  },
  {
    number: "5",
    title: "Community Guidelines",
    icon: Handshake,
    iconColor: "text-green-400",
    content:
      "All users must follow these rules: (1) Be respectful and polite — no harassment, hate speech, or toxicity. (2) No nudes, explicit images, or NSFW content of any kind — immediate suspension applies. (3) Professional communication only — no personal questions, romantic behaviour, or requests for photos beyond the profile gallery. (4) Respect privacy — never share another user's Discord, Steam, or personal details without consent, and never share or request gaming account passwords. (5) Consequences: violations result in a warning, temporary suspension, or permanent ban at Player4Hire's discretion. Full illustrated rules are shown below and on every user profile.",
  },
  {
    number: "6",
    title: "Verification",
    icon: CheckCircle2,
    iconColor: "text-purple-400",
    content:
      "Accounts are verified within 24–48 hours after submitting the required gaming account links. During this period, some features — including posting requests and placing bids — may be limited. We reserve the sole right to approve, request additional information, or reject verification applications.",
  },
  {
    number: "7",
    title: "One-Time Account Activation Fee",
    icon: Zap,
    iconColor: "text-amber-400",
    content:
      "To keep Player4Hire safe and enjoyable for real gamers, we charge a small one-time activation fee after a user's gaming account is verified. Unfortunately, some bad actors create fake or bot accounts to abuse the platform. This small fee helps us greatly reduce spam and maintain a high-quality, trustworthy community. India: ₹149 (one-time only). Global: $5 USD (one-time only). This is a one-time payment — users will not be charged again. This fee is non-refundable and is not held in the user's wallets. Thank you for understanding and for helping us build a better gaming community together.",
  },
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">

      {/* ── Hero ── */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center border border-primary/30"
            style={{ background: "linear-gradient(135deg, rgba(220,206,64,0.2) 0%, rgba(88,28,135,0.1) 100%)" }}
          >
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">About Player4Hire</h1>
            <div className="text-xs text-primary font-bold uppercase tracking-widest mt-0.5">Global Gaming Marketplace</div>
          </div>
        </div>

        {/* Thin accent bar */}
        <div className="h-px bg-gradient-to-r from-primary/60 via-secondary/40 to-transparent" />

        {/* Our Story CTA */}
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(220,206,64,0.07) 0%, rgba(196,174,244,0.07) 100%)",
            borderColor: "rgba(220,206,64,0.25)",
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(220,206,64,0.15)", border: "1px solid rgba(220,206,64,0.30)" }}
            >
              <Heart className="h-5 w-5" style={{ color: "#DCCE40" }} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: "#DCCE40" }}>
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
              background: "linear-gradient(135deg, #DCCE40 0%, #b5a730 60%, #C4AEF4 100%)",
              boxShadow: "0 4px 20px rgba(220,206,64,0.35), 0 0 0 1px rgba(220,206,64,0.20)",
            }}
          >
            <Heart className="h-4 w-4" />
            Our Story
          </Link>
        </div>

        {/* About paragraphs */}
        <div className="space-y-4 text-foreground/80 leading-relaxed">
          <p>
            <span className="text-white font-semibold">Player4Hire</span> is a global marketplace designed to connect
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
          This Disclaimer forms an integral and binding part of the Terms of Service.
          <br /><br />
          Player4Hire operates solely as an online intermediary marketplace that connects Hirers seeking gamers with Gamers offering co-op and multiplayer sessions.
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
                    style={{ background: "rgba(220,206,64,0.1)" }}
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

      {/* ── Community Guidelines & Behavior Rules ── */}
      <div
        className="rounded-2xl border p-5 space-y-5"
        style={{ background: "rgba(196,174,244,0.03)", borderColor: "rgba(196,174,244,0.15)" }}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center border border-cyan-400/30"
              style={{ background: "rgba(196,174,244,0.1)" }}
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-black text-white text-base leading-tight">Full Community Rules</h3>
            <p className="text-sm text-foreground/60 leading-relaxed">
              All users — both Hirers and Gamers — are expected to follow these rules. Violations may result in warnings, suspension, or permanent removal.
            </p>
          </div>
        </div>

        <div className="space-y-3 pl-12">
          {[
            {
              num: "1",
              icon: <Handshake className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />,
              title: "Be Respectful and Polite",
              text: "Treat every player with kindness and respect. No harassment, toxicity, hate speech, or personal attacks of any kind.",
              color: "border-green-500/20 bg-green-500/[0.03]",
            },
            {
              num: "2",
              icon: <Ban className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
              title: "No Inappropriate Content",
              text: "Sharing nudes, explicit images, sexual content, or any NSFW material is strictly prohibited. Violators will face immediate account suspension.",
              color: "border-red-500/20 bg-red-500/[0.03]",
            },
            {
              num: "3",
              icon: <MessageSquare className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
              title: "Maintain Professional Communication",
              text: "Keep conversations focused on gaming sessions. Do not ask for personal information, request photos beyond the allowed profile gallery, or engage in romantic or flirting behaviour.",
              color: "border-blue-500/20 bg-blue-500/[0.03]",
            },
            {
              num: "4",
              icon: <EyeOff className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />,
              title: "Respect Privacy",
              text: "Never share another user's Discord username, Steam profile, or personal details outside the platform without their explicit permission.",
              color: "border-purple-500/20 bg-purple-500/[0.03]",
            },
            {
              num: "5",
              icon: <UserCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
              title: "Fair Play",
              text: "Complete sessions honestly. Do not ghost, troll, or intentionally ruin the gaming experience for others.",
              color: "border-amber-500/20 bg-amber-500/[0.03]",
            },
          ].map((rule) => (
            <div
              key={rule.num}
              className={`rounded-xl border p-4 flex items-start gap-3 ${rule.color}`}
            >
              {rule.icon}
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white leading-snug">
                  <span className="text-muted-foreground/50 font-normal mr-1.5">{rule.num}.</span>
                  {rule.title}
                </p>
                <p className="text-xs text-foreground/60 leading-relaxed">{rule.text}</p>
              </div>
            </div>
          ))}

          {/* Consequences */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.03] p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white leading-snug">Consequences</p>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Breaking these rules may result in warnings, temporary suspension, or permanent ban. Player4Hire reserves the right to remove any user who makes others feel unsafe or uncomfortable — without prior notice.
              </p>
            </div>
          </div>
        </div>
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
          By using Player4Hire, you expressly agree to this Disclaimer and the Terms of Service. We reserve the right
          to modify this Disclaimer at any time, with or without prior notice. Your continued use of the Platform
          following any modifications constitutes your acceptance of the revised terms.
        </p>
        <div className="pt-1 text-xs text-primary/60 font-semibold uppercase tracking-wide">
          Player4Hire — Global Gaming Marketplace · April 2026
        </div>
      </div>

      {/* ── Socials CTA ── */}
      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(220,206,64,0.07) 0%, rgba(196,174,244,0.04) 100%)",
          borderColor: "rgba(220,206,64,0.22)",
          boxShadow: "0 0 30px rgba(220,206,64,0.08)",
        }}
      >
        <div
          className="shrink-0 h-14 w-14 rounded-2xl border flex items-center justify-center"
          style={{ background: "rgba(220,206,64,0.12)", borderColor: "rgba(220,206,64,0.30)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#DCCE40" strokeWidth={2.2} className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#DCCE40" }}>
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
            background: "linear-gradient(135deg, #DCCE40 0%, #b5a730 60%, #C4AEF4 100%)",
            boxShadow: "0 4px 24px rgba(220,206,64,0.30)",
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
