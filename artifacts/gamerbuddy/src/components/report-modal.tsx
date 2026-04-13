import React, { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportUser, REPORT_REASONS } from "@/lib/bids-api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const REASON_ICONS: Record<string, string> = {
  "Fraud / Scam attempt": "💰",
  "Asking for passwords or account login": "🔒",
  "Toxicity or harassment": "🚫",
  "Fake profile / impersonation": "🎭",
  "Not following objectives": "📋",
  "Other": "✏️",
};

interface ReportModalProps {
  reportedUserId: number;
  reportedUserName: string;
  onClose: () => void;
}

export function ReportModal({ reportedUserId, reportedUserName, onClose }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const reportUser = useReportUser();
  const { toast } = useToast();

  const canSubmit =
    !!selectedReason &&
    (selectedReason !== "Other" || description.trim().length >= 10) &&
    !reportUser.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await reportUser.mutateAsync({
        reportedUserId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.error || "Failed to submit report. Please try again.";
      toast({ title: "Report failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid rgba(239,68,68,0.25)",
          boxShadow: "0 0 60px rgba(239,68,68,0.08), 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border/40"
          style={{ background: "rgba(239,68,68,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <Flag className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Report User</div>
              <div className="text-xs text-muted-foreground">
                Reporting <span className="text-red-300 font-semibold">{reportedUserName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white mb-1">Report Submitted</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you for keeping Gamerbuddy safe. Our team will review this report shortly.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="mt-2 font-bold text-xs uppercase tracking-wide bg-primary hover:bg-primary/90 text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4">
              {/* Warning notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/6 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Reports are reviewed by our safety team. False reports may result in action against your account.
                </p>
              </div>

              {/* Reason selection */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Select a Reason *
                </div>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedReason === reason
                          ? "border-red-500/50 bg-red-500/8 shadow-[0_0_12px_rgba(239,68,68,0.08)]"
                          : "border-border/40 bg-background/40 hover:border-border/70 hover:bg-background/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selectedReason === reason
                            ? "border-red-400 bg-red-400"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {selectedReason === reason && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-base shrink-0">{REASON_ICONS[reason]}</span>
                      <span className={`text-sm font-medium ${selectedReason === reason ? "text-white" : "text-foreground/80"}`}>
                        {reason}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Additional Details{selectedReason === "Other" ? " *" : " (optional)"}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    selectedReason === "Other"
                      ? "Please describe the issue in detail (min 10 characters)…"
                      : "Any extra context that helps our team investigate…"
                  }
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-colors"
                />
                <div className="text-right text-[10px] text-muted-foreground/40">{description.length}/500</div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 text-xs font-bold uppercase tracking-wide"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit}
                className="flex-1 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                style={{
                  background: canSubmit
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : undefined,
                  boxShadow: canSubmit ? "0 4px 14px rgba(239,68,68,0.3)" : undefined,
                }}
              >
                {reportUser.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</>
                ) : (
                  <><Flag className="h-3.5 w-3.5 mr-1.5" />Submit Report</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ReportButtonProps {
  userId: number;
  userName: string;
  variant?: "icon" | "text" | "full";
}

export function ReportButton({ userId, userName, variant = "icon" }: ReportButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  if (!user || user.id === userId) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      {variant === "icon" && (
        <button
          onClick={handleClick}
          title={`Report ${userName}`}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Flag className="h-3 w-3" />
        </button>
      )}
      {variant === "text" && (
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-red-400 transition-colors font-medium"
        >
          <Flag className="h-3 w-3" />
          Report
        </button>
      )}
      {variant === "full" && (
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/25 text-xs font-semibold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
        >
          <Flag className="h-3 w-3" />
          Report User
        </button>
      )}
      {open && (
        <ReportModal
          reportedUserId={userId}
          reportedUserName={userName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
