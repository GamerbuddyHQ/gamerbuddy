import React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/bids-api";
import { useTheme } from "@/lib/theme";
import {
  ArrowLeft, DollarSign, Receipt, TrendingUp, Gift,
  ShieldCheck, Layers, Clock, BadgeCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PlatformFee {
  id: number;
  requestId: number | null;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface PlatformEarnings {
  totalFees: number;
  sessionFees: number;
  bulkFees: number;
  giftFees: number;
  feeCount: number;
  fees: PlatformFee[];
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  session_fee:      { label: "Session Fee",      icon: <ShieldCheck className="h-4 w-4" />, color: "#a855f7" },
  bulk_session_fee: { label: "Bulk Session Fee",  icon: <Layers className="h-4 w-4" />,      color: "#22d3ee" },
  gift_fee:         { label: "Tip Fee",           icon: <Gift className="h-4 w-4" />,         color: "#fb923c" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function PlatformEarnings() {
  const [, setLocation] = useLocation();
  const { isDark } = useTheme();

  const { data, isLoading, isError } = useQuery<PlatformEarnings>({
    queryKey: ["platform-earnings"],
    queryFn: () => apiFetch<PlatformEarnings>("/api/admin/platform-earnings"),
    staleTime: 15_000,
  });

  const cardBg = isDark
    ? "rgba(255,255,255,0.03)"
    : "rgba(0,0,0,0.025)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.10)";

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocation("/admin/security")}
          className="h-9 w-9 rounded-xl border border-border/50 bg-background/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 border border-primary/25 rounded-full px-2.5 py-0.5">
              Owner Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground leading-none">
            Platform Earnings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            10% platform fee collected from all sessions and tips — Test Mode
          </p>
        </div>
      </div>

      {/* How the split works */}
      <div
        className="rounded-2xl border p-5 space-y-3"
        style={{ background: "rgba(168,85,247,0.04)", borderColor: "rgba(168,85,247,0.20)" }}
      >
        <div className="text-xs font-extrabold uppercase tracking-widest text-primary/70">Fee Breakdown</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { pct: "90%", label: "To the Gamer", color: "#22c55e", sub: "Earnings Wallet" },
            { pct: "10%", label: "Platform Fee",  color: "#a855f7", sub: "Owner Account" },
            { pct: "10%", label: "On Tips Too",   color: "#fb923c", sub: "Same split for gifts" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ borderColor: `${item.color}22`, background: `${item.color}08` }}
            >
              <div
                className="text-2xl font-black tabular-nums"
                style={{ color: item.color }}
              >
                {item.pct}
              </div>
              <div>
                <div className="text-sm font-extrabold text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground/60">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : isError ? (
        <div className="text-center text-destructive py-10">Failed to load platform earnings.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Collected", value: data!.totalFees, color: "#a855f7", icon: <DollarSign className="h-5 w-5" /> },
              { label: "Session Fees",    value: data!.sessionFees, color: "#22d3ee", icon: <ShieldCheck className="h-5 w-5" /> },
              { label: "Bulk Fees",       value: data!.bulkFees,   color: "#60a5fa", icon: <Layers className="h-5 w-5" /> },
              { label: "Tip Fees",        value: data!.giftFees,   color: "#fb923c", icon: <Gift className="h-5 w-5" /> },
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
                <div className="text-3xl font-black tabular-nums text-foreground">
                  ${card.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total transactions count */}
          <div
            className="rounded-xl border px-5 py-3 flex items-center gap-3"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <BadgeCheck className="h-4 w-4 text-primary/60 shrink-0" />
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-bold">{data!.feeCount}</span>{" "}
              fee{data!.feeCount !== 1 ? "s" : ""} collected in total
            </span>
          </div>

          {/* Fee ledger */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div
              className="px-6 py-4 border-b flex items-center gap-2"
              style={{ borderColor: cardBorder, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
            >
              <Receipt className="h-4 w-4 text-primary/60" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/70">
                Fee Ledger — Latest {data!.fees.length}
              </span>
            </div>

            {data!.fees.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/50">No fees collected yet.</p>
                <p className="text-xs text-muted-foreground/35 mt-1">
                  Fees appear here when sessions are completed or tips are sent.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: cardBorder }}>
                {data!.fees.map((fee) => {
                  const meta = TYPE_META[fee.type] ?? {
                    label: fee.type, icon: <Receipt className="h-4 w-4" />, color: "#a855f7",
                  };
                  return (
                    <div
                      key={fee.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-primary/[0.02] transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}25` }}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{meta.label}</span>
                          {fee.requestId && (
                            <span className="text-[10px] font-semibold text-muted-foreground/50 bg-muted/30 rounded px-1.5 py-0.5">
                              Request #{fee.requestId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/55 truncate mt-0.5">{fee.description}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/40">
                          <Clock className="h-3 w-3" />
                          {fmtDate(fee.createdAt)} · {fmtTime(fee.createdAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold tabular-nums" style={{ color: meta.color }}>
                          +${fee.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Platform</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
