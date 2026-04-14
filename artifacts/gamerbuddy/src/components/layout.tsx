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
  ArrowLeft, Info, Shield, Users, Globe,
} from "lucide-react";
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
          <span className={`text-xs font-bold leading-tight ${notif.isRead ? "text-foreground/60" : "text-white"}`}>
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
              <span className="text-sm font-bold uppercase tracking-wider text-white">{t.nav.notifications}</span>
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
                  className="text-[10px] text-primary hover:text-white transition-colors flex items-center gap-1 font-semibold"
                >
                  <CheckCheck className="h-3 w-3" /> {t.nav.markAllRead}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors p-0.5">
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
                className="w-full text-center text-xs text-primary hover:text-white transition-colors py-2 font-semibold flex items-center justify-center gap-1.5"
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
                  style={isActive ? { color: "#c084fc" } : { color: "rgba(255,255,255,0.70)" }}
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
              } : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.55)",
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
    { href: "/browse",      label: t.nav.browseRequests, icon: Compass   },
    { href: "/tournaments", label: t.nav.tournaments,    icon: Trophy    },
    { href: "/community",   label: t.nav.community,      icon: Users     },
    ...(user
      ? [
          { href: "/dashboard",      label: t.nav.dashboard,      icon: LayoutDashboard },
          { href: "/my-requests",    label: t.nav.myRequests,     icon: FileText        },
          { href: "/my-tournaments", label: t.nav.myTournaments,  icon: Swords          },
          { href: "/wallets",        label: t.nav.wallets,        icon: Wallet          },
          { href: "/profile",        label: t.nav.profile,        icon: UserIcon        },
        ]
      : []),
    { href: "/about", label: t.nav.about, icon: Info },
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
            <LangSelector />
            <NotificationBell />

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
                      : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-white hover:bg-card/60"
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
      <footer className="border-t border-border/40 bg-background/60 mt-auto">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="container py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 opacity-60">
              <GamerbuddyLogo iconSize={20} textSize="lg" />
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-muted-foreground/50">{t.footer.tagline}</span>
            </div>

            <div className="flex items-center gap-5 text-xs text-muted-foreground/60">
              <Link
                href="/browse"
                className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
              >
                <Compass className="h-3 w-3" /> {t.footer.browse}
              </Link>
              <Link
                href="/about"
                className={`hover:text-primary transition-colors flex items-center gap-1.5 font-medium ${
                  location === "/about" ? "text-primary" : ""
                }`}
              >
                <Shield className="h-3 w-3" /> {t.footer.aboutDisclaimer}
              </Link>
            </div>

            <div className="text-xs text-muted-foreground/40 text-center md:text-right">
              {t.footer.copyright} {t.footer.earlyDev}
            </div>
          </div>
        </div>
      </footer>

      <AIChatWidget />
    </div>
  );
}
