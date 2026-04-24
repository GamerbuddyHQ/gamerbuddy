/**
 * Admin — Moderators Management
 * Only accessible to the main admin (admin cookie session).
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, DollarSign, Users, Wallet, LogOut,
  UserMinus, RefreshCw, Search, Clock, UserCheck,
  ChevronDown, ChevronUp, Minus, Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Types ────────────────────────────────────────────────────────────── */
type Moderator = {
  id: number;
  name: string;
  email: string;
  gamerbuddyId: string | null;
  profilePhotoUrl: string | null;
  moderatorAppointedAt: string | null;
  createdAt: string;
};

type ModAction = {
  id: number;
  action: string;
  targetType: string;
  targetId: number;
  meta: Record<string, unknown> | null;
  createdAt: string;
  moderatorId: number;
  modName: string | null;
  modGbId: string | null;
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
const ACTION_LABELS: Record<string, string> = {
  hide_post:    "Hid Post",
  restore_post: "Restored Post",
  delete_post:  "Deleted Post",
  pin_post:     "Pinned Post",
  ban_user:     "Banned User",
  unban_user:   "Unbanned User",
  mod_comment:  "Replied as Mod",
};

const ACTION_COLORS: Record<string, string> = {
  hide_post:    "rgba(251,191,36,0.15)",
  restore_post: "rgba(34,197,94,0.15)",
  delete_post:  "rgba(239,68,68,0.15)",
  pin_post:     "rgba(0,212,255,0.15)",
  ban_user:     "rgba(239,68,68,0.15)",
  unban_user:   "rgba(34,197,94,0.15)",
  mod_comment:  "rgba(99,102,241,0.15)",
};

const ACTION_TEXT_COLORS: Record<string, string> = {
  hide_post:    "#fbbf24",
  restore_post: "#22c55e",
  delete_post:  "#ef4444",
  pin_post:     "#00D4FF",
  ban_user:     "#ef4444",
  unban_user:   "#22c55e",
  mod_comment:  "#818cf8",
};

function fmtDateIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) + " IST";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
  });
}

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-xl object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 font-black text-white"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, rgba(0,212,255,0.5) 0%, rgba(139,92,246,0.5) 100%)",
        fontSize: size * 0.35,
        border: "1px solid rgba(0,212,255,0.30)",
      }}
    >
      {initials}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN NAV (shared across all admin pages)
══════════════════════════════════════════════════════════════════════════ */
const ADMIN_TABS = [
  { href: "/admin/dashboard",        label: "Payouts & Verifications", icon: DollarSign },
  { href: "/admin/community",         label: "Community Moderation",   icon: Users      },
  { href: "/admin/platform-earnings", label: "Platform Earnings",       icon: Wallet     },
  { href: "/admin/security",          label: "Security",                icon: Shield     },
  { href: "/admin/moderators",        label: "Moderators",              icon: UserCheck  },
];

function AdminNav({ onLogout }: { onLogout: () => void }) {
  const [location] = useLocation();
  return (
    <div
      className="sticky top-0 z-40 border-b border-border/40"
      style={{ background: "rgba(7,5,16,0.97)", backdropFilter: "blur(16px)" }}
    >
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-foreground">Player4Hire Admin</div>
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Management Console</div>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={onLogout}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      <div className="px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
        {ADMIN_TABS.map(item => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CURRENT MODERATORS SECTION
══════════════════════════════════════════════════════════════════════════ */
function CurrentModerators() {
  const qc = useQueryClient();

  const { data: mods = [], isLoading, refetch, isFetching } = useQuery<Moderator[]>({
    queryKey: ["admin-moderators-list"],
    queryFn:  () => apiFetch(`${BASE}/api/admin/community/moderators`),
    staleTime: 30_000,
  });

  const removeMod = useMutation({
    mutationFn: (userId: number) =>
      apiFetch(`${BASE}/api/admin/community/moderators/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-moderators-list"] });
      qc.invalidateQueries({ queryKey: ["admin-community-moderators"] });
      toast({ title: "Moderator Removed", description: "User no longer has moderator powers." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Current Moderators</h2>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-0.5">
              {isLoading ? "—" : `${mods.length} Active Moderator${mods.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Loading…</div>
        </div>
      ) : mods.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border/40 p-10 text-center"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <UserCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60 font-medium">No moderators appointed yet.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Appoint moderators from the Community Moderation tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mods.map(mod => (
            <div
              key={mod.id}
              className="rounded-xl border border-border/40 p-4 flex flex-col gap-3 transition-all hover:border-primary/20"
              style={{ background: "rgba(255,255,255,0.025)" }}
            >
              <div className="flex items-center gap-3">
                <Avatar url={mod.profilePhotoUrl} name={mod.name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-foreground truncate">{mod.name}</div>
                  <div className="text-[11px] text-primary/80 font-mono mt-0.5">
                    {mod.gamerbuddyId ?? "—"}
                  </div>
                </div>
                <Badge
                  className="text-[9px] font-black uppercase tracking-widest shrink-0"
                  style={{
                    background: "rgba(0,212,255,0.15)",
                    color: "#00D4FF",
                    border: "1px solid rgba(0,212,255,0.30)",
                  }}
                >
                  MOD
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  {mod.moderatorAppointedAt
                    ? `Appointed ${fmtDate(mod.moderatorAppointedAt)}`
                    : `Member since ${fmtDate(mod.createdAt)}`}
                </span>
              </div>

              <div className="border-t border-border/30 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs font-bold text-destructive/80 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                  onClick={() => removeMod.mutate(mod.id)}
                  disabled={removeMod.isPending}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Remove Moderator
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODERATOR ACTIVITY HISTORY SECTION
══════════════════════════════════════════════════════════════════════════ */
type SortCol = "createdAt" | "modName" | "action";
type SortDir = "asc" | "desc";

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all",   label: "All Time" },
];

function getActionDetail(action: ModAction): string {
  const meta = action.meta as Record<string, unknown> | null;
  if (!meta) return `Target ${action.targetType} #${action.targetId}`;
  if (action.action === "mod_comment") {
    const body = (meta.body as string | undefined) ?? "";
    return body.length > 60 ? body.slice(0, 60) + "…" : body;
  }
  if (meta.title) return String(meta.title);
  if (meta.targetName) return String(meta.targetName);
  return `${action.targetType} #${action.targetId}`;
}

function getActionTarget(action: ModAction): string {
  const meta = action.meta as Record<string, unknown> | null;
  if (!meta) return `${action.targetType} #${action.targetId}`;
  if (action.targetType === "post" && meta.title) return String(meta.title);
  if (action.targetType === "user" && meta.targetName) return String(meta.targetName);
  return `#${action.targetId}`;
}

function ActivityHistory() {
  const [period, setPeriod] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: raw = [], isLoading, isFetching, refetch } = useQuery<ModAction[]>({
    queryKey: ["admin-mod-actions", period],
    queryFn:  () => apiFetch(`${BASE}/api/admin/community/moderators/actions?period=${period}&search=`),
    staleTime: 15_000,
  });

  /* Client-side search + sort */
  const rows = useMemo(() => {
    let list = raw;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        (r.modName ?? "").toLowerCase().includes(s) ||
        (r.modGbId ?? "").toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s) ||
        (ACTION_LABELS[r.action] ?? "").toLowerCase().includes(s)
      );
    }
    list = [...list].sort((a, b) => {
      let av = "", bv = "";
      if (sortCol === "createdAt") { av = a.createdAt; bv = b.createdAt; }
      if (sortCol === "modName")   { av = a.modName ?? ""; bv = b.modName ?? ""; }
      if (sortCol === "action")    { av = a.action; bv = b.action; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [raw, search, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <Minus className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <Eye className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Moderator Activity History</h2>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-0.5">
              {isLoading ? "—" : `${rows.length} action${rows.length !== 1 ? "s" : ""} shown`}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Period tabs */}
        <div
          className="flex rounded-xl border border-border/40 overflow-hidden shrink-0"
          style={{ background: "rgba(255,255,255,0.025)" }}
        >
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                period === opt.value
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search by mod name, GB-ID, or action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-border/40 bg-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Loading…</div>
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border/40 p-10 text-center"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60 font-medium">No actions found.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Moderator actions will appear here once performed.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border border-border/40 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          {/* Table header */}
          <div
            className="grid text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 border-b border-border/40 px-4 py-2"
            style={{ gridTemplateColumns: "180px 160px 130px 1fr 1fr" }}
          >
            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("createdAt")}>
              Date & Time <SortIcon col="createdAt" />
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("modName")}>
              Moderator <SortIcon col="modName" />
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("action")}>
              Action <SortIcon col="action" />
            </button>
            <span>Target</span>
            <span>Details</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/20 max-h-[560px] overflow-y-auto">
            {rows.map(row => {
              const label = ACTION_LABELS[row.action] ?? row.action;
              const bg    = ACTION_COLORS[row.action] ?? "rgba(255,255,255,0.05)";
              const clr   = ACTION_TEXT_COLORS[row.action] ?? "#94a3b8";
              return (
                <div
                  key={row.id}
                  className="grid px-4 py-3 text-xs hover:bg-white/[0.02] transition-colors items-center"
                  style={{ gridTemplateColumns: "180px 160px 130px 1fr 1fr" }}
                >
                  <span className="text-muted-foreground/70 tabular-nums font-mono text-[10px]">
                    {fmtDateIST(row.createdAt)}
                  </span>
                  <div>
                    <div className="font-bold text-foreground truncate">{row.modName ?? "—"}</div>
                    <div className="text-[10px] text-primary/70 font-mono">{row.modGbId ?? "—"}</div>
                  </div>
                  <div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: bg, color: clr }}
                    >
                      {label}
                    </span>
                  </div>
                  <span className="text-muted-foreground/80 truncate pr-2">
                    {getActionTarget(row)}
                  </span>
                  <span className="text-muted-foreground/60 truncate">
                    {getActionDetail(row)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground/40 font-medium">
            Showing {rows.length} of {raw.length} total actions
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function AdminModerators() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  /* Verify admin cookie */
  const { data: authData, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth"],
    queryFn:  () => apiFetch(`${BASE}/api/admin/auth/me`),
    retry: false,
    staleTime: 300_000,
  });

  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/api/admin/auth/logout`, { method: "POST" }),
    onSuccess: () => { qc.clear(); navigate("/admin/login"); },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Authenticating…</div>
      </div>
    );
  }

  if (!authData?.isAdmin) {
    navigate("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav onLogout={() => logout.mutate()} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-10">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.30)" }}
          >
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-foreground">
              Moderators Management
            </h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Monitor all moderators and their activity in real time.
            </p>
          </div>
        </div>

        {/* Section 1 — Current Moderators */}
        <CurrentModerators />

        {/* Divider */}
        <div className="border-t border-border/30" />

        {/* Section 2 — Activity History */}
        <ActivityHistory />

      </div>
    </div>
  );
}
