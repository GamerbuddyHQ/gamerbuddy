import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiFetch, BASE } from "@/lib/bids-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Lock, Mail, KeyRound, Zap, AlertCircle } from "lucide-react";

function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)" }}
    />
  );
}

export default function AdminLogin() {
  const [, navigate] = useLocation();

  const [email,     setEmail]     = useState("gamerbuddyhq@gmail.com");
  const [password,  setPassword]  = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showKey,   setShowKey]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  /* Redirect if already logged in */
  useEffect(() => {
    fetch(`${BASE}/admin/auth/me`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.isAdmin) navigate("/admin/dashboard"); })
      .catch(() => {});
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) { setError("Password is required."); return; }
    if (!secretKey) { setError("Secret key is required."); return; }
    setLoading(true);
    try {
      await apiFetch(`${BASE}/admin/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, secretKey }),
      });
      navigate("/admin/dashboard");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      // Map common API errors to friendly messages
      if (raw.toLowerCase().includes("invalid credentials") || raw.toLowerCase().includes("401")) {
        setError("Login failed — check your password and secret key. Make sure you're copying them exactly with no extra spaces.");
      } else if (raw.toLowerCase().includes("too many") || raw.toLowerCase().includes("429")) {
        setError("Too many login attempts. Please wait 15 minutes before trying again.");
      } else if (raw.toLowerCase().includes("503") || raw.toLowerCase().includes("not configured")) {
        setError("Admin auth is not configured on the server. Contact your system administrator.");
      } else {
        setError(raw || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <GlowOrb className="w-[600px] h-[600px] -top-32 -left-32 opacity-60" />
      <GlowOrb className="w-[400px] h-[400px] -bottom-20 -right-20 opacity-40" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.15) 100%)",
                border: "1px solid rgba(168,85,247,0.40)",
                boxShadow: "0 0 40px rgba(168,85,247,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <Shield className="w-9 h-9 text-primary" />
            </div>
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-50 -z-10"
              style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)" }}
            />
          </div>

          <h1
            className="text-3xl font-black tracking-tight text-foreground"
            style={{ textShadow: "0 0 30px rgba(168,85,247,0.30)" }}
          >
            Admin Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Gamerbuddy &mdash; Secure Command Center
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(168,85,247,0.20)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Top accent line */}
          <div
            className="h-0.5 -mx-6 -mt-6 mb-6 rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(124,58,237,0.6), transparent)" }}
          />

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Admin Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 bg-background/40 border-border/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/40 border-border/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  required
                  autoComplete="current-password"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <Label htmlFor="secretKey" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Secret Key
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                <Input
                  id="secretKey"
                  type={showKey ? "text" : "password"}
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  className="pl-10 pr-10 bg-background/40 border-border/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/30 font-mono text-sm tracking-wider"
                  required
                  autoComplete="off"
                  placeholder="ADMIN_SECRET_KEY value"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/40 flex items-center gap-1">
                <KeyRound className="w-3 h-3 shrink-0" />
                The <span className="font-mono text-primary/60 mx-0.5">ADMIN_SECRET_KEY</span> from your Replit / Vercel secrets.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive/90 leading-snug">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? "rgba(124,58,237,0.50)"
                  : "linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #7c3aed 100%)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(147,51,234,0.40), 0 0 0 1px rgba(168,85,247,0.30)",
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Login as Admin
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-border/20 flex items-center justify-center gap-3">
            {[
              "Rate-limited · 5/15 min",
              "HMAC-signed session",
              "8 hr expiry",
            ].map((t, i) => (
              <span key={i} className="text-[10px] text-muted-foreground/30 font-medium">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
