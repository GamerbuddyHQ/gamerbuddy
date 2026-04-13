import React, { useState } from "react";
import { useListRequests, getListRequestsQueryKey, GameRequestPlatform, GameRequestSkillLevel, GameRequestStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function Browse() {
  const [platform, setPlatform] = useState<string>("all");
  const [skillLevel, setSkillLevel] = useState<string>("all");

  const queryParams = {
    ...(platform !== "all" && { platform }),
    ...(skillLevel !== "all" && { skillLevel }),
    status: GameRequestStatus.open
  };

  const { data: requests, isLoading, isError } = useListRequests(queryParams, {
    query: {
      queryKey: getListRequestsQueryKey(queryParams)
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">Browse Requests</h1>
        <p className="text-muted-foreground mt-2">Find open requests from other gamers and offer your skills.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 border border-border bg-card/30 rounded-lg backdrop-blur-sm">
        <div className="flex-1">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.values(GameRequestPlatform).map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={skillLevel} onValueChange={setSkillLevel}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Skill Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skill Levels</SelectItem>
              {Object.values(GameRequestSkillLevel).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : isError ? (
        <div className="text-center p-8 text-destructive">Failed to load requests.</div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-border rounded-xl bg-card/10">
          <h3 className="text-xl font-bold uppercase text-muted-foreground">No Requests Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map(req => (
            <Card key={req.id} className="flex flex-col border-border/50 bg-card/40 hover:bg-card/80 transition-colors group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary group-hover:shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-shadow"></div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-white group-hover:text-secondary transition-colors">{req.gameName}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">by <span className="text-primary font-semibold">{req.userName || `User #${req.userId}`}</span></div>
                  </div>
                  <div className="text-xs bg-muted px-2 py-1 rounded-sm border border-border">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="flex gap-2 mb-4">
                  <span className="inline-block px-2 py-1 bg-background border border-border rounded text-xs font-mono text-muted-foreground">
                    {req.platform}
                  </span>
                  <span className="inline-block px-2 py-1 bg-background border border-border rounded text-xs font-mono text-muted-foreground">
                    {req.skillLevel}
                  </span>
                </div>
                <div className="text-sm text-foreground/80 line-clamp-3 bg-background/50 p-3 rounded border border-border/50 font-sans">
                  "{req.objectives}"
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full bg-secondary/10 text-secondary border border-secondary hover:bg-secondary hover:text-secondary-foreground transition-all uppercase tracking-widest font-bold">
                  Accept Request
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}