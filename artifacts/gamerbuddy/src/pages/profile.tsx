import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useUpdateBio, useUserProfile } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert,
  Star, Trophy, Swords, Edit3, Check, X,
} from "lucide-react";

function TrustMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 1000) * 100));
  const color =
    pct >= 70 ? "from-green-500 to-emerald-400" :
    pct >= 40 ? "from-yellow-500 to-amber-400" :
    "from-red-500 to-rose-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground font-bold">Trust Factor</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-background border border-border overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>0</span>
        <span>500</span>
        <span>1000</span>
      </div>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useUserProfile(user?.id ?? null);
  const updateBio = useUpdateBio();

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");

  if (!user) return null;

  const handleEditBio = () => {
    setDraftBio(profile?.bio ?? "");
    setEditingBio(true);
  };

  const handleSaveBio = () => {
    updateBio.mutate({ bio: draftBio }, {
      onSuccess: () => {
        toast({ title: "Bio updated!" });
        setEditingBio(false);
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  const pointBadges = [
    { min: 0, label: "Recruit", color: "text-muted-foreground border-border" },
    { min: 100, label: "Veteran", color: "text-green-400 border-green-500/40 bg-green-500/10" },
    { min: 500, label: "Elite", color: "text-primary border-primary/40 bg-primary/10" },
    { min: 1000, label: "Legend", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
    { min: 5000, label: "Champion", color: "text-secondary border-secondary/40 bg-secondary/10" },
  ];

  const currentBadge = pointBadges.filter((b) => (profile?.points ?? user.points ?? 0) >= b.min).pop() ?? pointBadges[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">Gamer Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your identity, stats, and history on Gamerbuddy.</p>
      </div>

      {/* Hero card */}
      <Card className="border-border bg-card/40 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5 pointer-events-none" />
        <CardContent className="relative z-10 pt-6 space-y-6">

          {/* Avatar + name */}
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 bg-background border-2 border-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] shrink-0">
              <span className="text-3xl font-black text-primary uppercase">{user.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-extrabold text-white uppercase tracking-tight">{user.name}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {user.idVerified ? (
                  <span className="flex items-center text-xs font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/30">
                    <ShieldCheck className="w-3 h-3 mr-1" /> ID Verified
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/30">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Unverified
                  </span>
                )}
                <span className={`flex items-center text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentBadge.color}`}>
                  <Trophy className="w-3 h-3 mr-1" /> {currentBadge.label}
                </span>
                {profile?.avgRating != null && (
                  <span className="flex items-center text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/30">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                    {profile.avgRating.toFixed(1)} ({profile.reviewCount} review{profile.reviewCount !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trust factor meter */}
          <TrustMeter value={profile?.trustFactor ?? 100} />

          {/* Points */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 p-3 bg-background/50 rounded-xl border border-border text-center">
              <div className="text-2xl font-black text-primary">{profile?.points ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Points</div>
            </div>
            <div className="space-y-1 p-3 bg-background/50 rounded-xl border border-border text-center">
              <div className="text-2xl font-black text-secondary">{profile?.sessionsAsHirer?.length ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Hired</div>
            </div>
            <div className="space-y-1 p-3 bg-background/50 rounded-xl border border-border text-center">
              <div className="text-2xl font-black text-green-400">{profile?.sessionsAsGamer?.length ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Played</div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">About Me</div>
              {!editingBio && (
                <button
                  onClick={handleEditBio}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
            {editingBio ? (
              <div className="space-y-2">
                <Textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  placeholder="Tell others about yourself — your playstyle, favourite games, availability…"
                  className="resize-none h-24 bg-background text-sm"
                  maxLength={300}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white font-bold text-xs uppercase"
                    onClick={handleSaveBio}
                    disabled={updateBio.isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {updateBio.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs font-bold uppercase" onClick={() => setEditingBio(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/70 leading-relaxed min-h-[2rem]">
                {profile?.bio ?? <span className="text-muted-foreground/50 italic">No bio yet. Click Edit to add one.</span>}
              </p>
            )}
          </div>

          {/* Account info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-1 p-3 bg-background/50 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email
              </div>
              <div className="font-mono text-sm truncate">{user.email}</div>
            </div>
            <div className="space-y-1 p-3 bg-background/50 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Phone
              </div>
              <div className="font-mono text-sm">{user.phone}</div>
            </div>
            <div className="space-y-1 p-3 bg-background/50 rounded-lg border border-border md:col-span-2">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Member Since
              </div>
              <div className="font-mono text-sm">{format(new Date(user.createdAt), "MMMM do, yyyy")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews received */}
      {profile?.reviews && profile.reviews.length > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              Reviews Received
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-white">{r.reviewerName}</span>
                  </div>
                  <StarDisplay rating={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-foreground/75 leading-relaxed pl-9">{r.comment}</p>}
                <div className="text-xs text-muted-foreground pl-9">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      {(profile?.sessionsAsHirer?.length ?? 0) + (profile?.sessionsAsGamer?.length ?? 0) > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              Session History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile?.sessionsAsHirer?.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded font-bold">Hired</span>
                  <span className="text-sm font-semibold text-white">{s.gameName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
              </div>
            ))}
            {profile?.sessionsAsGamer?.map((s) => (
              <div key={s.requestId} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs uppercase tracking-wider text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded font-bold">Played</span>
                  <span className="text-sm font-semibold text-white">{s.gameName ?? "—"}</span>
                </div>
                {s.createdAt && <span className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
