import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import {
  Gamepad2, Compass, LayoutDashboard, Wallet, User as UserIcon,
  LogOut, FileText, Key, Bell, CheckCheck, X, Swords, Star,
  Trophy, MessageSquare, Zap, CircleDollarSign, ChevronRight, Menu,
} from "lucide-react";
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
              <span className="text-sm font-bold uppercase tracking-wider text-white">Notifications</span>
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
                  <CheckCheck className="h-3 w-3" /> All read
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
                <div className="text-xs text-muted-foreground/50">No notifications yet</div>
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
                View all notifications <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: clearAuth } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { href: "/browse", label: "Browse Requests", icon: Compass },
    { href: "/shop", label: "Shop", icon: Key },
    ...(user
      ? [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/my-requests", label: "My Requests", icon: FileText },
          { href: "/wallets", label: "Wallets", icon: Wallet },
          { href: "/profile", label: "Profile", icon: UserIcon },
        ]
      : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-primary shrink-0">
            <Gamepad2 className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight uppercase">GAMERBUDDY</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-6 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
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

            {/* Desktop auth */}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/signup">Sign Up</Link>
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

            <div className="pt-4 border-t border-border/40 mt-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-destructive/30 text-destructive bg-destructive/5 font-semibold text-base transition-all hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full bg-primary text-primary-foreground font-bold text-base">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full font-bold text-base">
                    <Link href="/login">Log In</Link>
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
    </div>
  );
}
