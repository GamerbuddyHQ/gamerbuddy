import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, AlertTriangle, Activity, Lock, Unlock,
  RefreshCw, User, DollarSign, Flag, Clock, ChevronDown,
  ChevronUp, Wallet, TrendingUp, Ban, CheckCircle2,
  XCircle, FileText, Search, Users, BadgeCheck, UserX, LogOut, UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ───────────────────────────────────────────────────────────────── */
type LoginAttemptEntry = {
  id: number;
  name: string;
  email: string;
  loginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  isCurrentlyLocked: boolean;
  minutesRemaining: number;
};

type LargeTransaction = {
  id: number;
  userId: number;
  userName: string | null;
  wallet: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
};

type ReportEntry = {
  id: number;
  reporterId: number;
  reporterName: string | null;
  reportedUserId: number;
  reportedUserName: string | null;
  reason: string;
  description: string | null;
  createdAt: string;
};

type TxEntry = {
  id: number;
  userId: number;
  userName: string | null;
  wallet: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
};

type SecurityData = {
  generatedAt: string;
  users: {
    total:    number;
    verified: number;
    pending:  number;
    banned:   number;
  };
  loginAttempts: LoginAttemptEntry[];
  suspicious: {
    largeTransactions: LargeTransaction[];
    reports: ReportEntry[];
  };
  transactions: TxEntry[];
};

/* ── Admin auth hook ─────────────────────────────────────────────────────── */
function useAdminAuth() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth-me"],
    queryFn:  () => apiFetch(`${BASE}/admin/auth/me`),
    retry:    false,
    staleTime: 30_000,
  });
}

/* ── Data hook ───────────────────────────────────────────────────────────── */
function useSecurityData(enabled: boolean) {
  return useQuery<SecurityData>({
    queryKey: ["admin-security"],
    queryFn:  () => apiFetch(`${BASE}/admin/security`),
    refetchInterval: 60_000,
    enabled,
  });
}

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, rgba(0,0,0,0.5) 100%)`,
        borderColor: `${color}30`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</div>
        <div className="text-2xl font-black text-white tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground/50 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({
  icon: Icon, title, count, color, children, defaultOpen = true,
}: {
  icon: React.ComponentType<any>;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `linear-gradient(180deg, ${color}08 0%, rgba(0,0,0,0.45) 100%)` }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="font-extrabold text-white uppercase tracking-wide text-sm">{title}</span>
          <span
            className="text-[11px] font-black px-2.5 py-0.5 rounded-full tabular-nums"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {count}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground/40" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground/40" />}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

/* ── TX type pill ────────────────────────────────────────────────────────── */
const TX_COLORS: Record<string, string> = {
  deposit:      "#22d3ee",
  withdrawal:   "#f97316",
  escrow_held:  "#a855f7",
  payout:       "#22c55e",
  gift:         "#ec4899",
  request_fee:  "#eab308",
  refund:       "#6366f1",
};

function TxPill({ type }: { type: string }) {
  const color = TX_COLORS[type] ?? "#888";
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

function WalletPill({ wallet }: { wallet: string }) {
  const color = wallet === "hiring" ? "#a855f7" : "#22d3ee";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ background: `${color}14`, color }}
    >
      {wallet}
    </span>
  );
}

/* ── Login Attempts table ────────────────────────────────────────────────── */
function LoginAttemptsTable({ rows }: { rows: LoginAttemptEntry[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clearing, setClearing] = useState<number | null>(null);

  const clearLockout = useMutation({
    mutationFn: (userId: number) =>
      apiFetch(`/api/admin/security/clear-lockout/${userId}`, { method: "POST" }),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ["admin-security"] });
      toast({ title: "Lockout cleared", description: `Account #${userId} reset successfully.` });
      setClearing(null);
    },
    onError: () => {
      toast({ title: "Failed", variant: "destructive" });
      setClearing(null);
    },
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground/50 py-4">
        <CheckCircle2 className="h-4 w-4 text-green-500/60" />
        No failed login attempts recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/30 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30 bg-white/[0.02]">
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">User</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Email</th>
            <th className="text-center px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Attempts</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Status</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Locked Until</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {rows.map((u) => (
            <tr key={u.id} className={`transition-colors ${u.isCurrentlyLocked ? "bg-red-500/5" : "hover:bg-white/[0.015]"}`}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold text-white/80 truncate max-w-[120px]">{u.name}</span>
                  <span className="text-muted-foreground/30 text-[10px]">#{u.id}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground/60 font-mono text-[11px]">{u.email}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className="font-black tabular-nums px-2 py-0.5 rounded-lg text-sm"
                  style={{
                    color:      u.loginAttempts >= 5 ? "#f87171" : u.loginAttempts >= 3 ? "#fbbf24" : "#86efac",
                    background: u.loginAttempts >= 5 ? "rgba(239,68,68,0.12)" : u.loginAttempts >= 3 ? "rgba(251,191,36,0.12)" : "rgba(134,239,172,0.10)",
                  }}
                >
                  {u.loginAttempts}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {u.isCurrentlyLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">
                    <Ban className="h-2.5 w-2.5" /> Locked · {u.minutesRemaining}m left
                  </span>
                ) : u.loginAttempts > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 bg-amber-500/8 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" /> Warning
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-400/70 px-2 py-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> OK
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground/50 whitespace-nowrap text-[11px]">
                {u.lockedUntil
                  ? format(new Date(u.lockedUntil), "MMM d, HH:mm")
                  : "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {(u.loginAttempts > 0 || u.lockedUntil) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={clearing === u.id}
                    onClick={() => {
                      setClearing(u.id);
                      clearLockout.mutate(u.id);
                    }}
                    className="h-7 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1.5"
                  >
                    <Unlock className="h-2.5 w-2.5" />
                    {clearing === u.id ? "Clearing…" : "Clear"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Large transactions table ────────────────────────────────────────────── */
function LargeTxTable({ rows }: { rows: LargeTransaction[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground/50 py-4">
        <CheckCircle2 className="h-4 w-4 text-green-500/60" />
        No transactions over $500 on record.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border/30 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30 bg-white/[0.02]">
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">User</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Type</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Wallet</th>
            <th className="text-right px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Amount</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Description</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Reference</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-amber-500/[0.03] transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-semibold text-white/80">{t.userName ?? "?"}</span>
                <span className="text-muted-foreground/30 ml-1 text-[10px]">#{t.userId}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap"><TxPill type={t.type} /></td>
              <td className="px-4 py-3 whitespace-nowrap"><WalletPill wallet={t.wallet} /></td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="font-black tabular-nums text-amber-400">${t.amount.toFixed(2)}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground/60 max-w-[200px] truncate">{t.description}</td>
              <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground/40 max-w-[120px] truncate">
                {t.referenceId ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground/50 whitespace-nowrap">
                {format(new Date(t.createdAt), "MMM d, HH:mm")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Reports table ───────────────────────────────────────────────────────── */
function ReportsTable({ rows }: { rows: ReportEntry[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground/50 py-4">
        <CheckCircle2 className="h-4 w-4 text-green-500/60" />
        No user reports filed yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border/30 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30 bg-white/[0.02]">
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Reporter</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Reported User</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Reason</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Details</th>
            <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-red-500/[0.03] transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-semibold text-white/70">{r.reporterName ?? "?"}</span>
                <span className="text-muted-foreground/30 ml-1 text-[10px]">#{r.reporterId}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-semibold text-red-300/80">{r.reportedUserName ?? "?"}</span>
                <span className="text-muted-foreground/30 ml-1 text-[10px]">#{r.reportedUserId}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-[10px] font-bold text-red-400/80 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {r.reason}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground/55 max-w-[220px] truncate">
                {r.description ?? <span className="text-muted-foreground/25 italic">No details</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground/50 whitespace-nowrap">
                {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Transactions log table ──────────────────────────────────────────────── */
function TransactionsLog({ rows }: { rows: TxEntry[] }) {
  const [search, setSearch] = useState("");
  const [walletFilter, setWalletFilter] = useState<"all" | "hiring" | "earnings">("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const allTypes = [...new Set(rows.map((r) => r.type))].sort();

  const filtered = rows.filter((t) => {
    if (walletFilter !== "all" && t.wallet !== walletFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (t.userName ?? "").toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.referenceId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3 mt-2">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search user, description, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border/40 bg-background/50 text-white placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40"
          />
        </div>
        <select
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value as any)}
          className="text-xs rounded-lg border border-border/40 bg-background/50 text-muted-foreground px-3 py-2 focus:outline-none"
        >
          <option value="all">All wallets</option>
          <option value="hiring">Hiring</option>
          <option value="earnings">Earnings</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs rounded-lg border border-border/40 bg-background/50 text-muted-foreground px-3 py-2 focus:outline-none"
        >
          <option value="all">All types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="text-[10px] text-muted-foreground/40 tabular-nums ml-auto">
          {filtered.length} / {rows.length} shown
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">ID</th>
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">User</th>
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Type</th>
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Wallet</th>
              <th className="text-right px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Amount</th>
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Description</th>
              <th className="text-left px-4 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground/40 text-xs">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground/30 tabular-nums font-mono">#{t.id}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-white/70">{t.userName ?? "?"}</span>
                    <span className="text-muted-foreground/30 ml-1 text-[10px]">#{t.userId}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><TxPill type={t.type} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><WalletPill wallet={t.wallet} /></td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <span
                      className="font-black tabular-nums"
                      style={{
                        color: t.type === "payout" || t.type === "deposit" || t.type === "refund" || t.type === "gift"
                          ? "#22c55e"
                          : "#f97316",
                      }}
                    >
                      ${t.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground/55 max-w-[220px] truncate">{t.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground/45 whitespace-nowrap">
                    {format(new Date(t.createdAt), "MMM d, HH:mm")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Admin top nav ───────────────────────────────────────────────────────── */
function AdminNav() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess:  () => navigate("/admin/login"),
    onError:    () => toast({ title: "Logout failed", variant: "destructive" }),
  });
  return (
    <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight text-foreground">Gamerbuddy Admin</span>
          <span className="hidden sm:inline text-xs text-muted-foreground/50 ml-2">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => logout.mutate()} disabled={logout.isPending}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
        {[
          { href: "/admin/dashboard",        label: "Payouts & Verifications", icon: DollarSign },
          { href: "/admin/community",         label: "Community Moderation",    icon: Users      },
          { href: "/admin/platform-earnings", label: "Platform Earnings",       icon: Wallet     },
          { href: "/admin/security",          label: "Security",                icon: Shield     },
          { href: "/admin/moderators",        label: "Moderators",              icon: UserCheck  },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              item.href === "/admin/security"
                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AdminSecurity() {
  const { data: authData, isLoading: authLoading } = useAdminAuth();
  const [, navigate] = useLocation();
  const reportsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !authData?.isAdmin) navigate("/admin/login");
  }, [authData, authLoading, navigate]);

  const { data, isLoading, error, refetch, isFetching } = useSecurityData(!!authData?.isAdmin);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const lockedCount  = data?.loginAttempts.filter((u) => u.isCurrentlyLocked).length ?? 0;
  const warningCount = data?.loginAttempts.filter((u) => !u.isCurrentlyLocked && u.loginAttempts > 0).length ?? 0;
  const reportCount  = data?.suspicious.reports.length ?? 0;
  const largeTxCount = data?.suspicious.largeTransactions.length ?? 0;
  const txTotal      = data?.transactions.length ?? 0;
  const hasSuspicious = lockedCount > 0 || largeTxCount > 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
              Security Dashboard
            </h1>
            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-muted-foreground/50 ml-12">
            {data
              ? `Last refreshed ${formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}`
              : "Real-time security overview · auto-refreshes every 60 seconds"}
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => refetch()} disabled={isFetching}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <div className="font-bold text-red-400 text-sm">Failed to load security data</div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              {(error as any)?.error ?? "Unknown error. Check that you are logged in as admin."}
            </div>
          </div>
        </div>
      )}

      {/* ── User overview stat cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : data ? (
        <>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">User Overview</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users}      label="Total Users"         value={data.users.total}    sub="All registered accounts"   color="#22d3ee" />
              <StatCard icon={BadgeCheck} label="Verified Users"      value={data.users.verified} sub="ID verified accounts"      color="#22c55e" />
              <StatCard icon={User}       label="Pending Verification" value={data.users.pending} sub="Awaiting ID review"        color="#f59e0b" />
              <StatCard icon={UserX}      label="Banned Users"        value={data.users.banned}   sub="Community banned accounts" color="#ef4444" />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">Security Signals</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Lock}          label="Locked Accounts" value={lockedCount}  sub={lockedCount ? "Currently locked out" : "All clear"} color="#ef4444" />
              <StatCard icon={AlertTriangle} label="Failed Logins"   value={warningCount} sub="Accounts with attempts"  color="#f59e0b" />
              <StatCard icon={Flag}          label="User Reports"    value={reportCount}  sub="Total reports filed"     color="#f97316" />
              <StatCard icon={TrendingUp}    label="Large Txns"      value={largeTxCount} sub="Transactions ≥ $500"     color="#a855f7" />
            </div>
          </div>
        </>
      ) : null}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-4"
          style={{ borderColor: "rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
              <Flag className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-foreground">User Reports</div>
              <div className="text-xs text-muted-foreground/55">
                {reportCount > 0 ? `${reportCount} report${reportCount !== 1 ? "s" : ""} filed` : "No reports yet"} — review below
              </div>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => reportsRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="shrink-0 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            View All Reports
          </Button>
        </div>

        <div
          className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-4"
          style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
              <Ban className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-foreground">Banned Users</div>
              <div className="text-xs text-muted-foreground/55">
                {data?.users.banned ?? 0} account{(data?.users.banned ?? 0) !== 1 ? "s" : ""} community banned
              </div>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => navigate("/admin/community")}
            className="shrink-0 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            View Banned Users
          </Button>
        </div>
      </div>

      {/* ── Suspicious activity warning ── */}
      {!isLoading && hasSuspicious && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/6 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-400 text-sm mb-1">⚠️ Suspicious Activity Detected</div>
            <div className="text-xs text-muted-foreground/65 space-y-0.5">
              {lockedCount > 0 && <div>• {lockedCount} account{lockedCount !== 1 ? "s" : ""} currently locked due to repeated failed logins</div>}
              {largeTxCount > 0 && <div>• {largeTxCount} transaction{largeTxCount !== 1 ? "s" : ""} flagged as unusually large (≥ $500) — review below</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── All clear banner ── */}
      {!isLoading && data && !hasSuspicious && reportCount === 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <span className="font-bold text-green-400 text-sm">All Clear</span>
            <span className="text-muted-foreground/60 text-xs ml-2">No suspicious activity or locked accounts detected.</span>
          </div>
        </div>
      )}

      {/* ── Section 1: Login attempts ── */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : data ? (
        <Section
          icon={Lock}
          title="Login Attempts & Account Lockouts"
          count={data.loginAttempts.length}
          color="#ef4444"
        >
          <p className="text-xs text-muted-foreground/50 mb-3">
            Users who have failed logins or are currently locked. Accounts are locked for 15 minutes after 5 consecutive failures.
          </p>
          <LoginAttemptsTable rows={data.loginAttempts} />
        </Section>
      ) : null}

      {/* ── Section 2: Suspicious activity ── */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : data ? (
        <div ref={reportsRef}>
        <Section
          icon={AlertTriangle}
          title="Flagged Suspicious Activity"
          count={largeTxCount + reportCount}
          color="#f59e0b"
        >
          {/* Large transactions sub-section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-amber-400/70" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70">
                Large Transactions ≥ $500
              </span>
              <span className="text-[10px] text-muted-foreground/40 ml-1">
                ({largeTxCount} total)
              </span>
            </div>
            <p className="text-xs text-muted-foreground/45 mb-2">
              These transactions triggered the anomaly detector on the server. Review for unusual patterns.
            </p>
            <LargeTxTable rows={data.suspicious.largeTransactions} />
          </div>

          {/* Reports sub-section */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="h-3.5 w-3.5 text-orange-400/70" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-orange-400/70">
                User Reports
              </span>
              <span className="text-[10px] text-muted-foreground/40 ml-1">
                ({reportCount} total)
              </span>
            </div>
            <p className="text-xs text-muted-foreground/45 mb-2">
              Reports filed by users against other users. Review and take action as needed.
            </p>
            <ReportsTable rows={data.suspicious.reports} />
          </div>
        </Section>
        </div>
      ) : null}

      {/* ── Section 3: Transaction log ── */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : data ? (
        <Section
          icon={Activity}
          title="Wallet Transaction Log"
          count={txTotal}
          color="#22d3ee"
          defaultOpen={false}
        >
          <p className="text-xs text-muted-foreground/50 mb-1">
            All wallet movements across all users — most recent 100 entries. Use filters to narrow down.
          </p>
          <TransactionsLog rows={data.transactions} />
        </Section>
      ) : null}

      {/* ── Platform Earnings link ── */}
      <div
        className="rounded-2xl border px-6 py-5 flex items-center justify-between gap-4"
        style={{ borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.04)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}
          >
            <DollarSign className="h-5 w-5" style={{ color: "#a855f7" }} />
          </div>
          <div>
            <div className="text-sm font-extrabold text-foreground">Platform Earnings</div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              View all 10% platform fees collected from sessions and tips.
            </div>
          </div>
        </div>
        <a
          href="/admin/platform-earnings"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all hover:opacity-80"
          style={{ borderColor: "rgba(168,85,247,0.40)", color: "#a855f7", background: "rgba(168,85,247,0.08)" }}
        >
          View Earnings →
        </a>
      </div>

      {/* ── Footer note ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/25 bg-white/[0.015] px-5 py-4">
        <FileText className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          This dashboard surfaces live data from the database. Anomaly WARN logs (server-level) are separate — check your
          server console or log aggregator for <code className="font-mono text-primary/50">SECURITY:</code> and{" "}
          <code className="font-mono text-primary/50">ANOMALY:</code> prefixed entries. Data auto-refreshes every 60 seconds.
        </p>
      </div>

    </div>
    </div>
  );
}
