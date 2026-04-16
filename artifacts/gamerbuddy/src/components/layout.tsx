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
  ArrowLeft, Info, Shield, Users, Globe, Sun, Moon, Sparkles, Map,
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

/* ── Language Selector ── */
function LangSelector() {
  const { lang, setLang, t } = useI18n();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/10 transition-all"
        title={t.nav.selectLanguage}
        aria-label={t.nav.selectLanguage}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:block text-[11px] font-bold text-muted-foreground/70">{current.code.toUpperCase()}</span>
        <Globe className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:block" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 rounded-2xl border border-border bg-card shadow-2xl z-[200] overflow-hidden py-1.5"
          style={{
            width: "min(220px, calc(100vw - 24px))",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mb-1" />
          <div className="px-3 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t.nav.selectLanguage}</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {LANGUAGES.map((l) => {
              const isActive = l.code === lang;
              return (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-primary/10"
                  style={isActive ? { color: "#c084fc" } : { color: isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.65)" }}
                >
                  <span className="text-lg w-6 text-center leading-none">{l.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold leading-tight">{l.nativeLabel}</div>
                    <div className="text-[10px] text-muted-foreground/50">{l.label}</div>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile Language Picker (standalone so hooks aren't inside a map) ── */
function MobileLangPicker({ onPick }: { onPick: () => void }) {
  const { lang, setLang, t } = useI18n();
  const { isDark } = useTheme();
  return (
    <div className="pt-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mb-2">{t.nav.selectLanguage}</p>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => {
          const isActive = l.code === lang;
          return (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); onPick(); }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors"
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
              <span className="text-[12px] font-bold truncate">{l.nativeLabel}</span>
            </button>
          );
        })}
      </div>
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
    { href: "/roadmap",  label: "Roadmap", icon: Map   },
    { href: "/socials",  label: "Socials",  icon: Globe },
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

              const isFollowUs = item.href === "/socials";
              if (isFollowUs) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-all duration-200 px-3 py-1.5 rounded-full"
                    style={isActive ? {
                      background: "rgba(34,211,238,0.18)",
                      border: "1px solid rgba(34,211,238,0.55)",
                      color: "#22d3ee",
                      boxShadow: "0 0 14px rgba(34,211,238,0.25)",
                    } : {
                      background: "rgba(34,211,238,0.07)",
                      border: "1px solid rgba(34,211,238,0.30)",
                      color: "rgba(34,211,238,0.80)",
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </Link>
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

            {/* Discord pill — desktop only */}
            <a
              href="https://discord.gg/pJcmECke"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{
                background: "rgba(88,101,242,0.12)",
                border: "1px solid rgba(88,101,242,0.35)",
                color: "#7289da",
                boxShadow: "0 0 12px rgba(88,101,242,0.15)",
              }}
              title="Join our Discord server"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Discord
            </a>

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

      <main className="flex-1 container py-6 md:py-8">
        {children}
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
                  { href: "/browse",   label: t.footer.browse,         icon: Compass },
                  { href: "/roadmap",  label: "Roadmap",                icon: Map     },
                  { href: "/socials",  label: "Socials",                icon: Globe   },
                  { href: "/about",    label: t.footer.aboutDisclaimer, icon: Shield  },
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

              {/* Social icon strip */}
              <div className="flex items-center gap-3">
                {[
                  { href: "https://discord.gg/pJcmECke",           label: "Discord",   color: "#5865F2", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg> },
                  { href: "https://www.youtube.com/@GamerbuddyHQ", label: "YouTube",   color: "#ff4444", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> },
                  { href: "https://x.com/GamerbuddyHQ",         label: "X",         color: "#e5e7eb", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                  { href: "https://instagram.com/gamerbuddy",  label: "Instagram", color: "#e1306c", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg> },
                  { href: "https://gamejolt.com/@Gamerbuddy",  label: "GameJolt",  color: "#2ccc78", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 8.25h-3v7.5h-4.5v-7.5h-3v-1.5h10.5v1.5z" /></svg> },
                  { href: "https://facebook.com/gamerbuddy",   label: "Facebook",  color: "#1877f2", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
                ].map(({ href, label, color, svg }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/40 bg-muted/20 transition-all hover:scale-110 hover:border-border"
                    style={{ color }}
                    title={label}
                  >
                    {svg}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Support email / Contact button ── */}
        <div className="container pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <a
            href="mailto:gamerbuddyhq@gmail.com"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-primary transition-colors group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 shrink-0 group-hover:text-primary transition-colors"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span className="font-medium">Support Email:</span>
            <span className="underline underline-offset-2 decoration-muted-foreground/30 group-hover:decoration-primary">
              gamerbuddyhq@gmail.com
            </span>
          </a>
          <a
            href="mailto:gamerbuddyhq@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(168,85,247,0.08)",
              borderColor: "rgba(168,85,247,0.28)",
              color: "#c084fc",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Contact Support
          </a>
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
