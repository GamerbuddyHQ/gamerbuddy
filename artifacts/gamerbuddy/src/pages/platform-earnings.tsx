import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, LogOut, DollarSign, TrendingUp, Gift, ShieldCheck,
  Layers, Clock, BadgeCheck, Receipt, Globe, MapPin, CalendarDays,
  CalendarRange, Wallet, Users, Info, Zap,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type FeeEntry = {
  id:          number;
  requestId:   number | null;
  amount:      number;
  type:        string;
  description: string;
  createdAt:   string;
  hirerRegion: string;
  gameName:    string | null;
  hirerName:   string | null;
  hirerGbId:   string | null;
};

type PlatformEarnings = {
  generatedAt:       string;
  totalFees:         number;
  todayFees:         number;
  weekFees:          number;
  monthFees:         number;
  sessionFees:       number;
  bulkFees:          number;
  giftFees:          number;
  feeCount:          number;
  completedSessions: number;
  india:  { total: number; count: number };
  global: { total: number; count: number };
  fees:   FeeEntry[];
};

/* ── Sample data shown when DB has no fees yet (Test Mode) ──────────────── */
const SAMPLE: PlatformEarnings = {
  generatedAt:       new Date().toISOString(),
  totalFees:         247.80,
  todayFees:         18.50,
  weekFees:          87.30,
  monthFees:         190.20,
  sessionFees:       165.00,
  bulkFees:          62.00,
  giftFees:          20.80,
  feeCount:          31,
  completedSessions: 48,
  india:  { total: 142.00, count: 18 },
  global: { total: 105.80, count: 13 },
  fees: [
    { id: 1, requestId: 101, amount: 12.00, type: "session_fee",      description: "Session: Valorant — $120.00 × 10%", createdAt: new Date(Date.now() - 3_600_000).toISOString(),  hirerRegion: "india",         gameName: "Valorant",     hirerName: "Arjun Mehta",  hirerGbId: "GB-001" },
    { id: 2, requestId: 102, amount: 25.00, type: "bulk_session_fee", description: "Bulk: BGMI — $250.00 × 10% (3 gamers)", createdAt: new Date(Date.now() - 7_200_000).toISOString(),  hirerRegion: "india",         gameName: "BGMI",         hirerName: "Priya Sharma", hirerGbId: "GB-002" },
    { id: 3, requestId: 103, amount: 8.00,  type: "session_fee",      description: "Session: Fortnite — $80.00 × 10%",  createdAt: new Date(Date.now() - 86_400_000).toISOString(), hirerRegion: "international", gameName: "Fortnite",     hirerName: "John Smith",   hirerGbId: "GB-003" },
    { id: 4, requestId: 104, amount: 3.50,  type: "gift_fee",         description: "Tip: CS2 — $35.00 × 10%",            createdAt: new Date(Date.now() - 172_800_000).toISOString(), hirerRegion: "international", gameName: "CS2",          hirerName: "Maria Lopez",  hirerGbId: "GB-004" },
    { id: 5, requestId: 105, amount: 18.00, type: "session_fee",      description: "Session: Dota 2 — $180.00 × 10%",    createdAt: new Date(Date.now() - 259_200_000).toISOString(), hirerRegion: "india",         gameName: "Dota 2",       hirerName: "Rahul Das",    hirerGbId: "GB-005" },
    { id: 6, requestId: 106, amount: 40.00, type: "bulk_session_fee", description: "Bulk: Overwatch 2 — $400 × 10%",     createdAt: new Date(Date.now() - 345_600_000).toISOString(), hirerRegion: "international", gameName: "Overwatch 2",  hirerName: "Emily Chen",   hirerGbId: "GB-006" },
    { id: 7, requestId: 107, amount: 6.80,  type: "gift_fee",         description: "Tip: Apex — $68 × 10%",              createdAt: new Date(Date.now() - 432_000_000).toISOString(), hirerRegion: "india",         gameName: "Apex Legends", hirerName: "Vikram Nair",  hirerGbId: "GB-007" },
    { id: 8, requestId: 108, amount: 15.00, type: "session_fee",      description: "Session: FIFA 24 — $150 × 10%",      createdAt: new Date(Date.now() - 518_400_000).toISOString(), hirerRegion: "international", gameName: "FIFA 24",      hirerName: "Carlos Ruiz",  hirerGbId: "GB-008" },
    { id: 9, requestId: 109, amount: 22.00, type: "bulk_session_fee", description: "Bulk: PUBG — $220 × 10% (2 gamers)", createdAt: new Date(Date.now() - 604_800_000).toISOString(), hirerRegion: "india",         gameName: "PUBG",         hirerName: "Anjali Patel", hirerGbId: "GB-009" },
    { id:10, requestId: 110, amount: 9.00,  type: "session_fee",      description: "Session: LoL — $90 × 10%",           createdAt: new Date(Date.now() - 691_200_000).toISOString(), hirerRegion: "international", gameName: "League of Legends", hirerName: "Tom Baker", hirerGbId: "GB-010" },
  ],
};

/* ── Admin auth check ───────────────────────────────────────────────────── */
function useAdminAuth() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth-me"],
    queryFn:  () => apiFetch(`${BASE}/admin/auth/me`),
    retry:    false,
    staleTime: 30_000,
  });
}

/* ── Type metadata ─────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { label: string; color: string }> = {
  session_fee:      { label: "Session Fee",     color: "#a855f7" },
  bulk_session_fee: { label: "Bulk Session Fee", color: "#22d3ee" },
  gift_fee:         { label: "Tip Fee",          color: "#fb923c" },
};

function fmtUSD(n: number) { return `$${n.toFixed(2)}`; }

/* ── Admin top nav (shared across admin pages) ──────────────────────────── */
function AdminNav() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess:  () => { navigate("/admin/login"); },
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
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
        {[
          { href: "/admin/dashboard",        label: "Payouts & Verifications", icon: DollarSign },
          { href: "/admin/community",         label: "Community Moderation",    icon: Users      },
          { href: "/admin/platform-earnings", label: "Platform Earnings",       icon: Wallet     },
          { href: "/admin/security",          label: "Security",                icon: Shield     },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              item.href === "/admin/platform-earnings"
                ? "bg-primary/15 text-primary border border-primary/30"
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

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function PlatformEarnings() {
  const [, navigate] = useLocation();
  const { data: authData, isLoading: authLoading } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && !authData?.isAdmin) navigate("/admin/login");
  }, [authData, authLoading, navigate]);

  const { data: raw, isLoading, isError } = useQuery<PlatformEarnings>({
    queryKey: ["platform-earnings"],
    queryFn:  () => apiFetch<PlatformEarnings>(`${BASE}/admin/platform-earnings`),
    staleTime: 15_000,
    enabled: !!authData?.isAdmin,
  });

  const isSample = !raw || raw.feeCount === 0;
  const d = isSample ? SAMPLE : raw!;

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
                Platform Earnings
              </h1>
              <span className="text-[10px] font-black text-primary/80 bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Owner
              </span>
            </div>
            <p className="text-xs text-muted-foreground/55 ml-12">
              10% platform fee collected from every completed quest, session, and tip
            </p>
          </div>

          {/* Test Mode / Sample badge */}
          {isSample && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2 text-xs text-amber-400 shrink-0">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-black uppercase tracking-wide">Test Mode</span>
                {" "}— sample data shown. Real fees appear when quests complete.
              </span>
            </div>
          )}
        </div>

        {/* ── Production payout note ── */}
        <div
          className="rounded-2xl border px-5 py-4 flex items-start gap-3"
          style={{ borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.04)" }}
        >
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground/70 leading-relaxed">
            <span className="font-black text-primary/90 uppercase tracking-wide">Production payout account: </span>
            All 10% platform fees from completed quests are transferred to{" "}
            <span className="font-bold text-foreground font-mono">creedx112@okicici</span>{" "}
            via Razorpay UPI (India) or international bank transfer. No action needed — Razorpay handles the split automatically.
          </div>
        </div>

        {/* ── Fee split explanation ── */}
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: "rgba(168,85,247,0.20)", background: "rgba(168,85,247,0.03)" }}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60 mb-1">How the 10% split works</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { pct: "90%", label: "To the Gamer",  color: "#22c55e", sub: "Earnings Wallet — withdrawable" },
              { pct: "10%", label: "Platform Fee",   color: "#a855f7", sub: "Owner (creedx112@okicici)" },
              { pct: "10%", label: "On Tips Too",    color: "#fb923c", sub: "Same split for all tips/gifts" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: `${item.color}22`, background: `${item.color}08` }}
              >
                <div className="text-2xl font-black tabular-nums" style={{ color: item.color }}>{item.pct}</div>
                <div>
                  <div className="text-sm font-extrabold text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground/55">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        )}

        {/* ── Error state ── */}
        {isError && !isSample && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            Failed to load earnings data from server. Showing sample data below.
          </div>
        )}

        {/* ── All-time summary ── */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">All-Time Summary</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Collected", value: fmtUSD(d.totalFees),   color: "#a855f7", icon: <DollarSign className="h-5 w-5" /> },
              { label: "Session Fees",    value: fmtUSD(d.sessionFees), color: "#22d3ee", icon: <ShieldCheck className="h-5 w-5" /> },
              { label: "Bulk Fees",       value: fmtUSD(d.bulkFees),    color: "#60a5fa", icon: <Layers className="h-5 w-5" /> },
              { label: "Tip Fees",        value: fmtUSD(d.giftFees),    color: "#fb923c", icon: <Gift className="h-5 w-5" /> },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border p-5 space-y-2"
                style={{ background: `${card.color}06`, borderColor: `${card.color}22` }}
              >
                <div className="flex items-center gap-2" style={{ color: card.color }}>
                  {card.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-75">{card.label}</span>
                </div>
                <div className="text-3xl font-black tabular-nums text-foreground">{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Time breakdown ── */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">Time Breakdown</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Today",      value: fmtUSD(d.todayFees), icon: <Clock className="h-4 w-4" />,        color: "#22c55e" },
              { label: "This Week",  value: fmtUSD(d.weekFees),  icon: <CalendarDays className="h-4 w-4" />, color: "#22d3ee" },
              { label: "This Month", value: fmtUSD(d.monthFees), icon: <CalendarRange className="h-4 w-4" />, color: "#a855f7" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border px-5 py-4 flex items-center gap-4"
                style={{ background: `${card.color}07`, borderColor: `${card.color}25` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}
                >
                  {card.icon}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{card.label}</div>
                  <div className="text-2xl font-black tabular-nums text-foreground">{card.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sessions + Geo split ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Completed sessions */}
          <div
            className="rounded-2xl border px-5 py-4 flex items-center gap-4"
            style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.22)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400/70">Completed Quests</div>
              <div className="text-2xl font-black tabular-nums text-foreground">{d.completedSessions}</div>
              <div className="text-[10px] text-muted-foreground/45 mt-0.5">All-time finished sessions</div>
            </div>
          </div>

          {/* India */}
          <div
            className="rounded-2xl border px-5 py-4 flex items-center gap-4"
            style={{ background: "rgba(251,146,60,0.06)", borderColor: "rgba(251,146,60,0.22)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-400/70">India Fees 🇮🇳</div>
              <div className="text-2xl font-black tabular-nums text-foreground">{fmtUSD(d.india.total)}</div>
              <div className="text-[10px] text-muted-foreground/45 mt-0.5">{d.india.count} transactions · UPI payout</div>
            </div>
          </div>

          {/* Global */}
          <div
            className="rounded-2xl border px-5 py-4 flex items-center gap-4"
            style={{ background: "rgba(96,165,250,0.06)", borderColor: "rgba(96,165,250,0.22)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">Global Fees 🌍</div>
              <div className="text-2xl font-black tabular-nums text-foreground">{fmtUSD(d.global.total)}</div>
              <div className="text-[10px] text-muted-foreground/45 mt-0.5">{d.global.count} transactions · Bank transfer</div>
            </div>
          </div>
        </div>

        {/* ── Fee count pill ── */}
        <div className="rounded-xl border border-border/30 bg-muted/20 px-5 py-3 flex items-center gap-3">
          <BadgeCheck className="h-4 w-4 text-primary/60 shrink-0" />
          <span className="text-sm text-muted-foreground">
            <span className="text-foreground font-bold">{d.feeCount}</span>{" "}
            platform fee{d.feeCount !== 1 ? "s" : ""} collected in total
            {isSample && <span className="text-amber-400/70 ml-2">(sample data)</span>}
          </span>
        </div>

        {/* ── Recent transactions ledger ── */}
        <div className="rounded-2xl border border-border/30 bg-muted/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 bg-muted/20 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary/60" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/70">
              Recent Transactions — Last {d.fees.slice(0, 10).length}
            </span>
            {isSample && (
              <span className="ml-auto text-[10px] font-bold text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Sample Data
              </span>
            )}
          </div>

          {d.fees.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/50">No fees collected yet.</p>
              <p className="text-xs text-muted-foreground/35 mt-1">Fees appear here when quests are completed or tips are sent.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 bg-muted/10">
                    <th className="text-left px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Date</th>
                    <th className="text-left px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Type</th>
                    <th className="text-left px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Game</th>
                    <th className="text-left px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Hirer (GB-ID)</th>
                    <th className="text-left px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Region</th>
                    <th className="text-right px-5 py-2.5 font-bold uppercase tracking-widest text-muted-foreground/50">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/15">
                  {d.fees.slice(0, 10).map((fee) => {
                    const meta = TYPE_META[fee.type] ?? { label: fee.type, color: "#a855f7" };
                    const isIndia = fee.hirerRegion === "india";
                    return (
                      <tr key={fee.id} className="hover:bg-primary/[0.015] transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground/55">
                          <div>{format(new Date(fee.createdAt), "MMM d")}</div>
                          <div className="text-[10px] text-muted-foreground/35">{format(new Date(fee.createdAt), "HH:mm")}</div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-foreground/80 font-medium max-w-[120px] truncate">
                          {fee.gameName ?? <span className="text-muted-foreground/30 italic">—</span>}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="text-foreground/75 font-medium">{fee.hirerName ?? "—"}</div>
                          {fee.hirerGbId && (
                            <div className="text-[10px] text-primary/60 font-mono">{fee.hirerGbId}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                            style={{
                              background: isIndia ? "rgba(251,146,60,0.12)" : "rgba(96,165,250,0.12)",
                              color:      isIndia ? "#fb923c" : "#60a5fa",
                            }}
                          >
                            {isIndia ? "🇮🇳 India" : "🌍 Global"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <span className="text-base font-extrabold tabular-nums" style={{ color: meta.color }}>
                            +{fmtUSD(fee.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
