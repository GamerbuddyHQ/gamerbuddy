import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { useI18n, LANGUAGES, type LangCode } from "@/lib/i18n";
import {
  Gamepad2, Compass, LayoutDashboard, Wallet, User as UserIcon,
  LogOut, FileText, Bell, CheckCheck, X, Swords, Star,
  Trophy, MessageSquare, Zap, CircleDollarSign, ChevronRight, Menu,
  ArrowLeft, Info, Shield, Users, Globe, Sparkles, Map, Heart,
  FlaskConical,
} from "lucide-react";
import { RegionalClock } from "@/components/regional-clock";
import { GamerbuddyLogo, GamerbuddyIcon } from "@/components/gamerbuddy-logo";
import { Button } from "@/components/ui/button";
import {
  useUnreadCount, useNotifications, useMarkNotificationRead,
  useMarkAllRead, type AppNotification,
} from "@/lib/bids-api";
import { useAuth as useAuthInner } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

/* ── BETA VERSION BANNER ──────────────────────────────────────────────────── */
const BETA_BANNER_KEY = "gb_test_mode_banner_v3";

const BETA_NOTICES = [
  { icon: "💳", text: "Payments in test mode — no real money moves" },
  { icon: "🎮", text: "Gaming accounts are manually reviewed by admin within 24–48 hours" },
  { icon: "⚡", text: "Real-time chat & live notifications coming in Phase 2" },
];

function TestModeBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BETA_BANNER_KEY) === "true"
  );

  const dismiss = () => {
    localStorage.setItem(BETA_BANNER_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="w-full border-b z-50 relative"
      style={{
        background: "linear-gradient(90deg, rgba(234,179,8,0.12) 0%, rgba(251,146,60,0.08) 100%)",
        borderColor: "rgba(234,179,8,0.35)",
      }}
    >
      <div className="container flex items-center justify-between gap-3 py-2 px-4">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <FlaskConical className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "rgba(234,179,8,0.22)", color: "#fde047", border: "1px solid rgba(234,179,8,0.45)" }}
            >
              Test Mode
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {BETA_NOTICES.map((n, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-white/15 hidden sm:inline">·</span>}
                <span className="text-[11px] text-white/60 whitespace-nowrap">
                  <span className="mr-1">{n.icon}</span>{n.text}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors"
          aria-label="Dismiss test mode banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  new_bid:         <Swords className="h-4 w-4 text-primary" />,
  bid_accepted:    <Zap className="h-4 w-4 text-green-400" />,
  session_started: <Gamepad2 className="h-4 w-4 text-secondary" />,
  payment_released:<CircleDollarSign className="h-4 w-4 text-emerald-400" />,
  review_received: <Star className="h-4 w-4 text-yellow-400" />,
  session_complete:<Trophy className="h-4 w-4 text-yellow-400" />,
  reward_earned:   <Trophy className="h-4 w-4 text-yellow-400" />,
};

const NOTIF_COLORS: Record<string, string> = {
  new_bid:         "bg-primary/10 border-primary/30",
  bid_accepted:    "bg-green-500/10 border-green-500/30",
  session_started: "bg-secondary/10 border-secondary/30",
  payment_released:"bg-emerald-500/10 border-emerald-500/30",
  review_received: "bg-yellow-500/10 border-yellow-500/30",
  session_complete:"bg-yellow-500/10 border-yellow-500/30",
  reward_earned:   "bg-yellow-500/10 border-yellow-500/30",
};

function NotifItem({ notif, onClick }: { notif: AppNotification; onClick: () => void }) {
  const [, setLocation] = useLocation();
  const markRead = useMarkNotificationRead();

  const handleClick = () => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.link) setLocation(notif.link);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-xl border transition-all hover:brightness-110 flex items-start gap-3 ${
        notif.isRead
          ? "border-border/40 bg-background/30 opacity-70"
          : (NOTIF_COLORS[notif.type] ?? "border-primary/20 bg-primary/5")
      }`}
    >
      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center border ${notif.isRead ? "border-border/40 bg-background/40" : (NOTIF_COLORS[notif.type] ?? "border-primary/20 bg-primary/10")}`}>
        {NOTIF_ICONS[notif.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs font-bold leading-tight ${notif.isRead ? "text-foreground/60" : "text-foreground"}`}>
            {notif.title}
          </span>
          {!notif.isRead && <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-0.5" />}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{notif.message}</p>
        <div className="text-[10px] text-muted-foreground/50 mt-1">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </div>
      </div>
      {notif.link && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />}
    </button>
  );
}

function NotificationBell() {
  const { user } = useAuthInner();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllRead();

  const unread = unreadData?.count ?? 0;
  const recent = notifications.slice(0, 8);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/10 transition-all"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-0.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center leading-none shadow-[0_0_8px_rgba(232,255,0,0.6)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 rounded-2xl border border-border bg-card shadow-2xl z-[200] overflow-hidden"
          style={{
            width: "min(320px, calc(100vw - 24px))",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">{t.nav.notifications}</span>
              {unread > 0 && (
                <span className="text-[10px] font-black bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[10px] text-primary hover:text-foreground transition-colors flex items-center gap-1 font-semibold"
                >
                  <CheckCheck className="h-3 w-3" /> {t.nav.markAllRead}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
            {recent.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/20" />
                <div className="text-xs text-muted-foreground/50">{t.nav.noNotifications}</div>
              </div>
            ) : (
              recent.map((n) => <NotifItem key={n.id} notif={n} onClick={() => setOpen(false)} />)
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border/40 p-2">
              <button
                onClick={() => { setOpen(false); setLocation("/notifications"); }}
                className="w-full text-center text-xs text-primary hover:text-foreground transition-colors py-2 font-semibold flex items-center justify-center gap-1.5"
              >
                {t.nav.viewAll} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Languages shown in selector (English live, others coming soon) ── */
const SELECTOR_LANGS = ["en", "hi", "es", "fr", "de", "pt"] as const;
const COMING_SOON_SET = new Set(["hi", "es", "fr", "de", "pt"]);

/* ── Coming Soon Modal ── */
function LangComingSoonModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #0d0620 0%, #080415 100%)",
          border: "1px solid rgba(232,255,0,0.30)",
          boxShadow: "0 0 60px rgba(232,255,0,0.20), 0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #E8FF00, #E8FF00, #C5A46E)" }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(232,255,0,0.15)", border: "1px solid rgba(232,255,0,0.30)" }}
            >
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-tight leading-none">Multi-language support</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Coming soon to Player4Hire</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            We're working hard to add <span className="text-white font-semibold">Hindi, Spanish, French, German, Portuguese</span> and more languages to Player4Hire.
          </p>
          <p className="text-xs text-muted-foreground/70 leading-relaxed mb-5">
            Thank you for your patience! The site is currently available in <span className="text-primary font-semibold">English</span>.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { flag: "🇮🇳", label: "हिन्दी" },
              { flag: "🇪🇸", label: "Español" },
              { flag: "🇫🇷", label: "Français" },
              { flag: "🇩🇪", label: "Deutsch" },
              { flag: "🇵🇹", label: "Português" },
            ].map((l) => (
              <span
                key={l.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: "rgba(232,255,0,0.10)", border: "1px solid rgba(232,255,0,0.25)", color: "rgba(232,255,0,0.80)" }}
              >
                {l.flag} {l.label}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-black uppercase tracking-widest text-sm text-[#0A0A0E] transition-all hover:brightness-105"
            style={{ background: "linear-gradient(135deg, #E8FF00 0%, #d4eb00 100%)", boxShadow: "0 4px 16px rgba(232,255,0,0.28)" }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Language Selector ── */
function LangSelector() {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayLangs = LANGUAGES.filter((l) => (SELECTOR_LANGS as readonly string[]).includes(l.code));
  const current = displayLangs.find((l) => l.code === lang) ?? displayLangs[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(code: string) {
    setOpen(false);
    if (COMING_SOON_SET.has(code)) {
      setShowComingSoon(true);
    }
  }

  return (
    <>
      {showComingSoon && <LangComingSoonModal onClose={() => setShowComingSoon(false)} />}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/10 transition-all"
          title={t.nav.selectLanguage}
          aria-label={t.nav.selectLanguage}
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="hidden sm:block text-[11px] font-bold text-muted-foreground/70">EN</span>
          <Globe className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:block" />
        </button>

        {open && (
          <div
            className="absolute right-0 top-11 rounded-2xl border border-border bg-card shadow-2xl z-[200] overflow-hidden py-1.5"
            style={{
              width: "min(240px, calc(100vw - 24px))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mb-1" />
            <div className="px-3 pb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t.nav.selectLanguage}</p>
            </div>
            <div>
              {displayLangs.map((l) => {
                const isActive = l.code === lang || (l.code === "en" && !COMING_SOON_SET.has(lang));
                const isComingSoon = COMING_SOON_SET.has(l.code);
                return (
                  <button
                    key={l.code}
                    onClick={() => handleSelect(l.code)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                    style={isActive ? { color: "#E8FF00" } : { color: "rgba(255,255,255,0.70)" }}
                  >
                    <span className="text-lg w-6 text-center leading-none">{l.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold leading-tight">{l.nativeLabel}</div>
                      <div className="text-[10px] text-muted-foreground/50">{l.label}</div>
                    </div>
                    {isComingSoon ? (
                      <span
                        className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(232,255,0,0.15)", color: "rgba(232,255,0,0.80)", border: "1px solid rgba(232,255,0,0.25)" }}
                      >
                        Soon
                      </span>
                    ) : isActive ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mx-3 mt-1.5 mb-1 pt-1.5 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground/40 text-center">More languages coming soon 🌍</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Mobile Language Picker (standalone so hooks aren't inside a map) ── */
function MobileLangPicker({ onPick }: { onPick: () => void }) {
  const { lang, t } = useI18n();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const displayLangs = LANGUAGES.filter((l) => (SELECTOR_LANGS as readonly string[]).includes(l.code));

  function handleSelect(code: string) {
    if (COMING_SOON_SET.has(code)) {
      setShowComingSoon(true);
    } else {
      onPick();
    }
  }

  return (
    <div className="pt-3">
      {showComingSoon && <LangComingSoonModal onClose={() => { setShowComingSoon(false); onPick(); }} />}
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mb-2">{t.nav.selectLanguage}</p>
      <div className="grid grid-cols-2 gap-2">
        {displayLangs.map((l) => {
          const isActive = l.code === lang || (l.code === "en" && !COMING_SOON_SET.has(lang));
          const isComingSoon = COMING_SOON_SET.has(l.code);
          return (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors relative"
              style={isActive ? {
                background: "rgba(232,255,0,0.15)",
                borderColor: "rgba(232,255,0,0.40)",
                color: "#E8FF00",
              } : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-bold truncate block">{l.nativeLabel}</span>
                {isComingSoon && (
                  <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: "rgba(232,255,0,0.70)" }}>Soon</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/30 text-center mt-2">More languages coming soon 🌍</p>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: clearAuth } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [location]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
        setLocation("/");
      },
    });
  };

  /* ── Public nav links — always shown in center desktop nav ── */
  const publicNavItems = [
    { href: "/browse",    label: t.nav.browseRequests, icon: Compass, style: "default"  },
    { href: "/community", label: "Community",           icon: Users,   style: "purple"   },
    { href: "/roadmap",   label: "Roadmap",             icon: Map,     style: "default"  },
    { href: "/our-story", label: "Our Story",           icon: Heart,   style: "gradient" },
    { href: "https://www.superr.bio/gamerbuddy", label: "Social", icon: Globe, style: "cyan" },
    { href: "/about",     label: t.nav.about,           icon: Info,    style: "default"  },
  ];

  /* ── User-specific links — shown in user dropdown (desktop) + mobile menu ── */
  const userNavItems = user ? [
    { href: "/dashboard",   label: t.nav.dashboard,  icon: LayoutDashboard },
    { href: "/my-requests", label: t.nav.myRequests,  icon: FileText        },
    { href: "/wallets",     label: t.nav.wallets,     icon: Wallet          },
    { href: "/profile",     label: t.nav.profile,     icon: UserIcon        },
  ] : [];

  /* ── All items combined for mobile menu ── */
  const allMobileItems = [...publicNavItems, ...userNavItems];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
        {/* thin cyan accent line at top */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center gap-3">

          {/* ── LEFT: Back + Logo ─────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {location !== "/" && (
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-1 h-8 px-2 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/8 hover:text-primary text-muted-foreground/60 transition-all text-xs font-semibold"
                aria-label={t.nav.back}
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.nav.back}</span>
              </button>
            )}
            <Link href="/" className="flex items-center group navbar-logo">
              <span
                className="font-extrabold leading-none select-none brand-text sm:text-2xl text-xl"
                style={{ letterSpacing: "0.01em" }}
              >
                <span style={{ color: "#FDF8F3" }}>Player</span>
                <span style={{ color: "#E8FF00" }}>4</span>
                <span style={{ color: "#FDF8F3" }}>Hire</span>
              </span>
            </Link>
          </div>

          {/* thin vertical divider */}
          <div className="hidden lg:block h-6 w-px bg-border/50 shrink-0" />

          {/* ── CENTER: Main public nav ───────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 justify-center">
            {publicNavItems.map((item) => {
              const isActive = !item.href.startsWith("http") && location.startsWith(item.href);
              const isExternal = item.href.startsWith("http");

              if (item.style === "gradient") {
                const El = isExternal ? "a" : Link;
                const elProps = isExternal
                  ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
                  : { href: item.href };
                return (
                  <El
                    key={item.href}
                    {...(elProps as any)}
                    className="text-[13px] font-black whitespace-nowrap transition-all duration-200 px-3.5 py-1.5 rounded-full"
                    style={isActive ? {
                      background: "linear-gradient(135deg, #E8FF00 0%, #C5A46E 60%, #E8FF00 100%)",
                      border: "1px solid rgba(232,255,0,0.70)",
                      color: "#fff",
                      boxShadow: "0 0 16px rgba(232,255,0,0.35), 0 0 4px rgba(232,255,0,0.15)",
                    } : {
                      background: "linear-gradient(135deg, rgba(232,255,0,0.10) 0%, rgba(232,255,0,0.10) 100%)",
                      border: "1px solid rgba(232,255,0,0.35)",
                      color: "rgba(232,255,0,0.85)",
                    }}
                  >
                    {item.label}
                  </El>
                );
              }

              if (item.style === "purple") {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-[13px] font-semibold whitespace-nowrap transition-all duration-200 px-3.5 py-1.5 rounded-full"
                    style={isActive ? {
                      background: "rgba(232,255,0,0.18)",
                      border: "1px solid rgba(232,255,0,0.55)",
                      color: "#E8FF00",
                      boxShadow: "0 0 12px rgba(232,255,0,0.20)",
                    } : {
                      background: "rgba(232,255,0,0.06)",
                      border: "1px solid rgba(232,255,0,0.25)",
                      color: "rgba(232,255,0,0.65)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              }

              if (item.style === "cyan") {
                const El = isExternal ? "a" : Link;
                const elProps = isExternal
                  ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
                  : { href: item.href };
                return (
                  <El
                    key={item.href}
                    {...(elProps as any)}
                    className="text-[13px] font-bold whitespace-nowrap transition-all duration-200 px-3.5 py-1.5 rounded-full"
                    style={{
                      background: "rgba(232,255,0,0.07)",
                      border: "1px solid rgba(232,255,0,0.28)",
                      color: "rgba(232,255,0,0.75)",
                    }}
                  >
                    {item.label}
                  </El>
                );
              }

              /* default style */
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "text-[13px] font-medium whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ── RIGHT: Utilities + Auth ───────────────────────────── */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto lg:ml-0">

            {/* Notification bell (logged-in only) */}
            <NotificationBell />

            {/* Language selector */}
            <LangSelector />

            {/* Regional clock */}
            <RegionalClock />

            {/* Desktop auth / user menu */}
            {user ? (
              /* ── Logged-in: user avatar dropdown ── */
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={[
                    "h-9 flex items-center gap-1.5 px-2.5 rounded-xl border transition-all duration-200",
                    userMenuOpen
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/60 text-foreground/70 hover:border-primary/50 hover:bg-primary/8",
                  ].join(" ")}
                  aria-label="User menu"
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="text-[13px] font-semibold max-w-[80px] truncate hidden lg:block">
                    {(user.name ?? "User").split(" ")[0]}
                  </span>
                  <ChevronRight className={["h-3 w-3 shrink-0 opacity-50 transition-transform duration-200", userMenuOpen ? "rotate-90" : ""].join(" ")} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 rounded-2xl border border-border/70 bg-popover z-[200] overflow-hidden"
                    style={{ width: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.32), 0 0 0 1px rgba(232,255,0,0.10)" }}
                  >
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <div className="px-3 pt-2.5 pb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{user.name}</p>
                    </div>
                    {userNavItems.map((item) => {
                      const isActive = location.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
                            isActive ? "text-primary bg-primary/8" : "text-foreground/75 hover:bg-muted/50 hover:text-foreground",
                          ].join(" ")}
                        >
                          <item.icon className="h-4 w-4 shrink-0 opacity-70" />
                          {item.label}
                        </Link>
                      );
                    })}
                    <div className="border-t border-border/40 mx-2 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/6 transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0 opacity-70" />
                      {t.nav.signOut}
                    </button>
                    <div className="h-1" />
                  </div>
                )}
              </div>
            ) : (
              /* ── Logged-out: Log In + Sign Up ── */
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="h-9 px-4 flex items-center text-[13px] font-semibold text-muted-foreground hover:text-foreground rounded-xl border border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {t.nav.logIn}
                </Link>
                <Link
                  href="/signup"
                  className="h-9 px-4 flex items-center text-[13px] font-bold text-[#0A0A0E] rounded-xl transition-all hover:brightness-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #E8FF00 0%, #d4eb00 100%)",
                    boxShadow: "0 4px 14px rgba(232,255,0,0.30)",
                  }}
                >
                  {t.nav.signUp}
                </Link>
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/8 transition-all"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-[58px] z-40 bg-background/98 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto px-4 py-5 space-y-1.5">

            {allMobileItems.map((item) => {
              const isActive = !item.href.startsWith("http") && location.startsWith(item.href);
              const isExternal = item.href.startsWith("http");
              const isGradient = (item as any).style === "gradient";
              const isCyan = (item as any).style === "cyan";
              const isPurple = (item as any).style === "purple";

              if (isExternal || isCyan) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-bold text-[15px] transition-all"
                    style={{ background: "rgba(232,255,0,0.07)", borderColor: "rgba(232,255,0,0.28)", color: "rgba(232,255,0,0.80)" }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </a>
                );
              }

              if (isGradient) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-black text-[15px] transition-all"
                    style={isActive ? {
                      background: "linear-gradient(135deg, #E8FF00 0%, #C5A46E 60%, #E8FF00 100%)",
                      borderColor: "rgba(232,255,0,0.70)", color: "#fff",
                      boxShadow: "0 0 20px rgba(232,255,0,0.30)",
                    } : {
                      background: "linear-gradient(135deg, rgba(232,255,0,0.10) 0%, rgba(232,255,0,0.10) 100%)",
                      borderColor: "rgba(232,255,0,0.35)", color: "rgba(232,255,0,0.90)",
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              if (isPurple) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-semibold text-[15px] transition-all"
                    style={isActive ? {
                      background: "rgba(232,255,0,0.14)", borderColor: "rgba(232,255,0,0.55)", color: "#E8FF00",
                      boxShadow: "0 0 16px rgba(232,255,0,0.16)",
                    } : {
                      background: "rgba(232,255,0,0.05)", borderColor: "rgba(232,255,0,0.28)", color: "rgba(232,255,0,0.75)",
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl border font-semibold text-[15px] transition-all",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-card/60",
                  ].join(" ")}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile language picker */}
            <MobileLangPicker onPick={() => setMobileOpen(false)} />

            <div className="pt-4 border-t border-border/40 space-y-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-destructive/30 text-destructive bg-destructive/5 font-semibold text-[15px] transition-all hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {t.nav.signOut}
                </button>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center w-full py-3.5 rounded-xl font-black text-[15px] text-[#0A0A0E] transition-all hover:brightness-105"
                    style={{ background: "linear-gradient(135deg, #E8FF00 0%, #d4eb00 100%)", boxShadow: "0 4px 16px rgba(232,255,0,0.30)" }}
                  >
                    {t.nav.signUp}
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center w-full py-3.5 rounded-xl border border-border/60 font-bold text-[15px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    {t.nav.logIn}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <TestModeBanner />

      <main className="flex-1 w-full">
        {location === "/" ? children : (
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-8">
            {children}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        {/* ── Main section: brand + site links ── */}
        <div className="container pt-8 pb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">

            {/* Brand */}
            <div className="space-y-2 min-w-0">
              <GamerbuddyLogo iconSize={22} textSize="xl" />
              <p className="text-xs text-muted-foreground/55 leading-relaxed max-w-[220px]">
                {t.footer.tagline}
              </p>
            </div>

            {/* Site navigation links */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { href: "/browse",     label: t.footer.browse,         icon: Compass },
                  { href: "/roadmap",   label: "Roadmap",                icon: Map     },
                  { href: "/our-story", label: "Our Story",              icon: Heart   },
                  { href: "/about",     label: t.footer.aboutDisclaimer, icon: Shield  },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                      location.startsWith(href) ? "text-primary" : "text-muted-foreground/65"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ── Legal strip ── */}
        <div className="border-t border-border/40">
          <div className="container py-4 space-y-3">

            {/* Policy links + short copyright on same row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground/50">
                {[
                  { href: "/about",            label: "About"      },
                  { href: "/roadmap",          label: "Roadmap"    },
                  { href: "/about",            label: "Terms"      },
                  { href: "/about#disclaimer", label: "Disclaimer" },
                ].map(({ href, label }, i, arr) => (
                  <span key={label} className="flex items-center gap-4">
                    <Link
                      href={href}
                      className="hover:text-primary transition-colors font-medium"
                    >
                      {label}
                    </Link>
                    {i < arr.length - 1 && (
                      <span className="text-border/80 select-none">·</span>
                    )}
                  </span>
                ))}
              </div>

              <p className="text-xs text-muted-foreground/45 font-medium whitespace-nowrap">
                © 2026 Player4Hire&nbsp;&nbsp;|&nbsp;&nbsp;All Rights Reserved
              </p>
            </div>

            {/* Full copyright notice */}
            <p className="text-[11px] leading-relaxed text-muted-foreground/30 text-center max-w-2xl mx-auto">
              © 2026 Player4Hire. All Rights Reserved. This website and all its content, design,
              features, and code are protected under copyright law. Unauthorized copying,
              reproduction, or distribution is strictly prohibited.
            </p>
          </div>
        </div>
      </footer>

      <AIChatWidget />
    </div>
  );
}
