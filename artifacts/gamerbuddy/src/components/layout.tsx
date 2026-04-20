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
  ArrowLeft, Info, Shield, Users, Globe, Sun, Moon, Sparkles, Map, Heart,
  FlaskConical,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { RegionalClock } from "@/components/regional-clock";
import { GamerbuddyLogo, GamerbuddyIcon } from "@/components/gamerbuddy-logo";
import { Button } from "@/components/ui/button";
import {
  useUnreadCount, useNotifications, useMarkNotificationRead,
  useMarkAllRead, type AppNotification,
} from "@/lib/bids-api";
import { useAuth as useAuthInner } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

/* ── TEST MODE BANNER ─────────────────────────────────────────────────────── */
const TEST_BANNER_KEY = "gb_test_banner_dismissed_v1";

function TestModeBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(TEST_BANNER_KEY) === "true"
  );

  const dismiss = () => {
    localStorage.setItem(TEST_BANNER_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="w-full border-b z-50 relative"
      style={{
        background: "linear-gradient(90deg, rgba(234,179,8,0.14) 0%, rgba(251,146,60,0.14) 100%)",
        borderColor: "rgba(234,179,8,0.30)",
      }}
    >
      <div className="container flex items-center justify-between gap-3 py-2 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <FlaskConical className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <p className="text-[11px] font-bold text-amber-300/90 leading-tight">
            <span className="font-black uppercase tracking-wider text-amber-300">Test Mode</span>
            <span className="text-amber-200/60 font-normal ml-2">
              Payments are in test mode — no real money moves. Razorpay test keys are active.
            </span>
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/15 transition-colors"
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
          <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-0.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center leading-none shadow-[0_0_8px_rgba(168,85,247,0.6)]">
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
          border: "1px solid rgba(168,85,247,0.30)",
          boxShadow: "0 0 60px rgba(168,85,247,0.20), 0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #22d3ee, #a855f7, #7c3aed)" }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.30)" }}
            >
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-tight leading-none">Multi-language support</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Coming soon to Gamerbuddy</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            We're working hard to add <span className="text-white font-semibold">Hindi, Spanish, French, German, Portuguese</span> and more languages to Gamerbuddy.
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
                style={{ background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.25)", color: "rgba(192,132,252,0.80)" }}
              >
                {l.flag} {l.label}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 4px 16px rgba(147,51,234,0.30)" }}
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
  const { isDark } = useTheme();
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
                    style={isActive ? { color: "#c084fc" } : { color: isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.65)" }}
                  >
                    <span className="text-lg w-6 text-center leading-none">{l.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold leading-tight">{l.nativeLabel}</div>
                      <div className="text-[10px] text-muted-foreground/50">{l.label}</div>
                    </div>
                    {isComingSoon ? (
                      <span
                        className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(168,85,247,0.15)", color: "rgba(192,132,252,0.80)", border: "1px solid rgba(168,85,247,0.25)" }}
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
  const { isDark } = useTheme();
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
                background: "rgba(168,85,247,0.15)",
                borderColor: "rgba(168,85,247,0.40)",
                color: "#c084fc",
              } : isDark ? {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.55)",
              } : {
                background: "rgba(0,0,0,0.04)",
                borderColor: "rgba(0,0,0,0.10)",
                color: "rgba(0,0,0,0.60)",
              }}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-bold truncate block">{l.nativeLabel}</span>
                {isComingSoon && (
                  <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: "rgba(192,132,252,0.70)" }}>Soon</span>
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
  const { t } = useI18n();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
        setLocation("/");
      },
    });
  };

  const navItems = [
    { href: "/browse",     label: t.nav.browseRequests, icon: Compass },
    { href: "/community",  label: "Community",           icon: Users   },
    ...(user
      ? [
          { href: "/dashboard",   label: t.nav.dashboard,  icon: LayoutDashboard },
          { href: "/my-requests", label: t.nav.myRequests,  icon: FileText        },
          { href: "/wallets",     label: t.nav.wallets,     icon: Wallet          },
          { href: "/profile",     label: t.nav.profile,     icon: UserIcon        },
        ]
      : []),
    { href: "/roadmap",  label: "Roadmap",   icon: Map   },
    { href: "/our-story", label: "Our Story", icon: Heart },
    { href: "https://www.superr.bio/gamerbuddy", label: "Social", icon: Globe },
    { href: "/about",    label: t.nav.about, icon: Info },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {location !== "/" && (
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all text-sm font-semibold"
                aria-label={t.nav.back}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.nav.back}</span>
              </button>
            )}
            <Link href="/" className="flex items-center">
              <span className="sm:hidden">
                <GamerbuddyLogo iconSize={22} textSize="base" />
              </span>
              <span className="hidden sm:flex">
                <GamerbuddyLogo iconSize={26} textSize="xl" />
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-5 flex-1 justify-center items-center">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              const isCommunity = item.href === "/community";

              if (isCommunity) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 px-3 py-1.5 rounded-full"
                    style={isActive ? {
                      background: "rgba(168,85,247,0.18)",
                      border: "1px solid rgba(168,85,247,0.55)",
                      color: "#c084fc",
                      boxShadow: "0 0 14px rgba(168,85,247,0.25), inset 0 1px 0 rgba(168,85,247,0.15)",
                    } : {
                      background: "rgba(168,85,247,0.06)",
                      border: "1px solid rgba(168,85,247,0.28)",
                      color: "rgba(192,132,252,0.70)",
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              const isOurStory = item.href === "/our-story";
              if (isOurStory) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm font-black whitespace-nowrap transition-all duration-200 px-3 py-1.5 rounded-full text-white"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)"
                        : "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(34,211,238,0.18) 100%)",
                      border: isActive
                        ? "1px solid rgba(168,85,247,0.70)"
                        : "1px solid rgba(168,85,247,0.40)",
                      color: isActive ? "#fff" : "rgba(192,132,252,0.90)",
                      boxShadow: isActive
                        ? "0 0 18px rgba(168,85,247,0.40), 0 0 6px rgba(34,211,238,0.20)"
                        : "0 0 10px rgba(168,85,247,0.18)",
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              const isFollowUs = item.href.startsWith("https://www.superr.bio");
              if (isFollowUs) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-all duration-200 px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(34,211,238,0.07)",
                      border: "1px solid rgba(34,211,238,0.30)",
                      color: "rgba(34,211,238,0.80)",
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />

            {/* Language selector */}
            <LangSelector />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:text-primary transition-all text-muted-foreground"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Desktop auth */}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t.nav.signOut}
              </Button>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">{t.nav.logIn}</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/signup">{t.nav.signUp}</Link>
                </Button>
              </div>
            )}

            {/* Hamburger */}
            <button
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 transition-all"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-md overflow-y-auto">
          <div className="container py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              const isCommunity = item.href === "/community";
              const isOurStoryMobile = item.href === "/our-story";
              const isExternal = item.href.startsWith("http");

              if (isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-bold text-base transition-all duration-200"
                    style={{
                      background: "rgba(34,211,238,0.07)",
                      borderColor: "rgba(34,211,238,0.30)",
                      color: "rgba(34,211,238,0.80)",
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </a>
                );
              }

              if (isCommunity) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-semibold text-base transition-all duration-200"
                    style={isActive ? {
                      background: "rgba(168,85,247,0.14)",
                      borderColor: "rgba(168,85,247,0.55)",
                      color: "#c084fc",
                      boxShadow: "0 0 20px rgba(168,85,247,0.18), inset 0 1px 0 rgba(168,85,247,0.12)",
                    } : {
                      background: "rgba(168,85,247,0.05)",
                      borderColor: "rgba(168,85,247,0.30)",
                      color: "rgba(192,132,252,0.75)",
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              if (isOurStoryMobile) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border font-black text-base transition-all duration-200"
                    style={isActive ? {
                      background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)",
                      borderColor: "rgba(168,85,247,0.70)",
                      color: "#fff",
                      boxShadow: "0 0 24px rgba(168,85,247,0.35), 0 0 8px rgba(34,211,238,0.20)",
                    } : {
                      background: "linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(34,211,238,0.10) 100%)",
                      borderColor: "rgba(168,85,247,0.40)",
                      color: "rgba(192,132,252,0.90)",
                      boxShadow: "0 0 12px rgba(168,85,247,0.15)",
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
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border font-semibold text-base transition-all ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-card/60"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile language picker */}
            <MobileLangPicker onPick={() => setMobileOpen(false)} />

            <div className="pt-4 border-t border-border/40 mt-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-destructive/30 text-destructive bg-destructive/5 font-semibold text-base transition-all hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {t.nav.signOut}
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full bg-primary text-primary-foreground font-bold text-base">
                    <Link href="/signup">{t.nav.signUp}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full font-bold text-base">
                    <Link href="/login">{t.nav.logIn}</Link>
                  </Button>
                </div>
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
                © 2026 Gamerbuddy&nbsp;&nbsp;|&nbsp;&nbsp;All Rights Reserved
              </p>
            </div>

            {/* Full copyright notice */}
            <p className="text-[11px] leading-relaxed text-muted-foreground/30 text-center max-w-2xl mx-auto">
              © 2026 Gamerbuddy. All Rights Reserved. This website and all its content, design,
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
