import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListRequests, getListRequestsQueryKey, GameRequestStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Search, Swords, Monitor, Layers, Gavel, ArrowRight } from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"];
const SKILLS = ["Beginner", "Intermediate", "Expert", "Chill"];

const PLATFORM_ICON: Record<string, string> = {
  PC: "🖥️", PlayStation: "🎮", Xbox: "🟩", "Nintendo Switch": "🕹️",
  "Steam Deck": "🎲", iOS: "📱", Android: "🤖",
};

const SKILL_COLOR: Record<string, string> = {
  Beginner: "border-green-500/40 text-green-400 bg-green-500/10",
  Intermediate: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  Expert: "border-primary/40 text-primary bg-primary/10",
  Chill: "border-secondary/40 text-secondary bg-secondary/10",
};

export default function Browse() {
  const [, setLocation] = useLocation();
  const [platform, setPlatform] = useState("all");
  const [skillLevel, setSkillLevel] = useState("all");
  const [search, setSearch] = useState("");

  const queryParams = {
    ...(platform !== "all" && { platform }),
    ...(skillLevel !== "all" && { skillLevel }),
    status: GameRequestStatus.open,
  };

  const { data: allRequests, isLoading, isError } = useListRequests(queryParams, {
    query: { queryKey: getListRequestsQueryKey(queryParams) },
  });

  const requests = allRequests?.filter((r) =>
    search.trim() === "" ||
    r.gameName.toLowerCase().includes(search.toLowerCase()) ||
    r.objectives.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
            <Swords className="h-7 w-7 text-primary" />
            Browse Requests
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Find open missions and place your bid to earn.
          </p>
        </div>
        {requests && (
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            {requests.length} {requests.length === 1 ? "request" : "requests"} open
          </span>
        )}
      </div>

      <SafetyBanner showSelfHire={false} storageKey="gb_safety_browse" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border bg-card/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search game or objectives…"
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-background border-border w-full sm:w-44">
            <Monitor className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{PLATFORM_ICON[p]} {p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={skillLevel} onValueChange={setSkillLevel}>
          <SelectTrigger className="bg-background border-border w-full sm:w-44">
            <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Skill Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skill Levels</SelectItem>
            {SKILLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : isError ? (
        <div className="text-center p-8 text-destructive">Failed to load requests.</div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl bg-card/10">
          <Swords className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-lg font-bold uppercase text-muted-foreground">No Open Requests</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try a different search term." : "Check back soon or adjust your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card
              key={req.id}
              className="border-border/50 bg-card/40 hover:bg-card/80 hover:border-primary/30 transition-all cursor-pointer group overflow-hidden"
              onClick={() => setLocation(`/requests/${req.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Left: info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">
                          by <span className="text-primary font-semibold">{req.userName || "Gamer"}</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-white group-hover:text-primary transition-colors">
                          {req.gameName}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs border border-border rounded px-2 py-0.5 font-semibold text-muted-foreground bg-background">
                          {PLATFORM_ICON[req.platform]} {req.platform}
                        </span>
                        <span className={`text-xs border rounded px-2 py-0.5 font-semibold ${SKILL_COLOR[req.skillLevel] ?? "text-muted-foreground border-border"}`}>
                          {req.skillLevel}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed border-l-2 border-primary/30 pl-3">
                      {req.objectives}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Posted {format(new Date(req.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Gavel className="h-3.5 w-3.5" />
                      <span>Open for bids</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-secondary/10 border border-secondary/40 text-secondary hover:bg-secondary hover:text-black font-bold uppercase text-xs tracking-wider group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
                      onClick={(e) => { e.stopPropagation(); setLocation(`/requests/${req.id}`); }}
                    >
                      View & Bid <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
