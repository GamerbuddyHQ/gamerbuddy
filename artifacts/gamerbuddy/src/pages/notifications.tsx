import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useNotifications, useMarkNotificationRead, useMarkAllRead,
  useDeleteNotification, type AppNotification,
} from "@/lib/bids-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import {
  Bell, CheckCheck, Trash2, Swords, Zap, Gamepad2, CircleDollarSign,
  Star, Trophy, Filter, X, ChevronRight,
} from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; dot: string }> = {
  new_bid:          { label: "New Bid",          icon: <Swords className="h-4.5 w-4.5" />,          color: "text-primary border-primary/40 bg-primary/10",          dot: "bg-primary" },
  bid_accepted:     { label: "Bid Accepted",     icon: <Zap className="h-4.5 w-4.5" />,             color: "text-green-400 border-green-500/40 bg-green-500/10",   dot: "bg-green-400" },
  session_started:  { label: "Session Started",  icon: <Gamepad2 className="h-4.5 w-4.5" />,        color: "text-secondary border-secondary/40 bg-secondary/10",   dot: "bg-secondary" },
  payment_released: { label: "Payment Released", icon: <CircleDollarSign className="h-4.5 w-4.5" />,color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", dot: "bg-emerald-400" },
  review_received:  { label: "Review Received",  icon: <Star className="h-4.5 w-4.5" />,            color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10", dot: "bg-yellow-400" },
  session_complete: { label: "Session Complete", icon: <Trophy className="h-4.5 w-4.5" />,          color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10", dot: "bg-yellow-400" },
  reward_earned:    { label: "Reward Earned",    icon: <Trophy className="h-4.5 w-4.5" />,          color: "text-amber-400 border-amber-500/40 bg-amber-500/10",   dot: "bg-amber-400" },
};

const ALL_TYPES = Object.keys(TYPE_META);

function NotifCard({ notif }: { notif: AppNotification }) {
  const [, setLocation] = useLocation();
  const markRead = useMarkNotificationRead();
  const deleteNotif = useDeleteNotification();
  const [confirming, setConfirming] = useState(false);

  const meta = TYPE_META[notif.type] ?? {
    label: "Notification",
    icon: <Bell className="h-4.5 w-4.5" />,
    color: "text-muted-foreground border-border/40 bg-background/30",
    dot: "bg-muted-foreground",
  };

  const handleClick = () => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.link) setLocation(notif.link);
  };

  return (
    <div className={`rounded-2xl border p-4 transition-all group relative ${
      notif.isRead
        ? "border-border/40 bg-card/30 opacity-75"
        : `${meta.color} shadow-[0_0_20px_rgba(0,0,0,0.15)]`
    }`}>
      <div className="flex items-start gap-4">
        {/* Icon circle */}
        <div className={`shrink-0 h-10 w-10 rounded-full border flex items-center justify-center ${
          notif.isRead ? "border-border/40 bg-background/40 text-muted-foreground/50" : meta.color
        }`}>
          {meta.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              {!notif.isRead && <span className={`shrink-0 h-2 w-2 rounded-full ${meta.dot}`} />}
              <span className={`text-sm font-bold truncate ${notif.isRead ? "text-foreground/60" : "text-white"}`}>
                {notif.title}
              </span>
              <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground/50">
                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
              </span>
              {confirming ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteNotif.mutate(notif.id)} className="text-destructive hover:text-red-300 transition-colors p-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-white transition-colors p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive p-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-foreground/70 mt-1.5 leading-relaxed">{notif.message}</p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground/40">
              {format(new Date(notif.createdAt), "MMM d, yyyy · h:mm a")}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {!notif.isRead && (
                <button
                  onClick={() => markRead.mutate(notif.id)}
                  className="text-[11px] text-primary hover:text-white transition-colors font-semibold flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> Mark read
                </button>
              )}
              {notif.link && (
                <button
                  onClick={handleClick}
                  className="text-[11px] font-bold uppercase tracking-wider text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  View <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const [filter, setFilter] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.isRead) return false;
    if (filter && n.type !== filter) return false;
    return true;
  });

  const typeCounts = ALL_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = notifications.filter((n) => n.type === t).length;
    return acc;
  }, {});

  const activeTypesInData = ALL_TYPES.filter((t) => typeCounts[t] > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? (
              <><span className="text-primary font-bold">{unreadCount} unread</span> · {notifications.length} total</>
            ) : (
              `${notifications.length} total · all caught up!`
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter bar */}
      {notifications.length > 0 && (
        <Card className="border-border/50 bg-card/40">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                <Filter className="h-3.5 w-3.5" /> Filter
              </div>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  showUnreadOnly ? "bg-primary/20 border-primary/50 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"
                }`}
              >
                Unread only
              </button>
              <div className="h-4 w-px bg-border/40" />
              <button
                onClick={() => setFilter(null)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  !filter ? "bg-white/10 border-white/20 text-white" : "border-border/50 text-muted-foreground hover:border-white/20"
                }`}
              >
                All types
              </button>
              {activeTypesInData.map((t) => {
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(filter === t ? null : t)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                      filter === t ? m.color : "border-border/50 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {m.label}
                    <span className="text-[9px] opacity-70">({typeCounts[t]})</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40 bg-card/30">
          <CardContent className="py-16 text-center space-y-3">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/15" />
            <div className="text-base font-bold text-muted-foreground/40">
              {filter || showUnreadOnly ? "No notifications match this filter" : "No notifications yet"}
            </div>
            <p className="text-sm text-muted-foreground/30 leading-relaxed max-w-xs mx-auto">
              {filter || showUnreadOnly
                ? "Try clearing your filters to see all notifications."
                : "Post a request or place a bid to start receiving notifications."}
            </p>
            {(filter || showUnreadOnly) && (
              <Button
                size="sm"
                onClick={() => { setFilter(null); setShowUnreadOnly(false); }}
                className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase mt-2"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => <NotifCard key={n.id} notif={n} />)}
        </div>
      )}
    </div>
  );
}
