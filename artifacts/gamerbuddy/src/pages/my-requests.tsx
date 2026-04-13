import React from "react";
import { Link } from "wouter";
import { useGetMyRequests, getGetMyRequestsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus } from "lucide-react";

export default function MyRequests() {
  const { data: requests, isLoading, isError } = useGetMyRequests({
    query: {
      queryKey: getGetMyRequestsQueryKey()
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">My Requests</h1>
          <p className="text-muted-foreground mt-2">Manage the requests you've posted.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(168,85,247,0.4)]">
          <Link href="/post-request">
            <Plus className="mr-2 h-5 w-5" />
            New Request
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : isError ? (
        <div className="text-center p-8 text-destructive">Failed to load your requests.</div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-border rounded-xl bg-card/10 flex flex-col items-center">
          <h3 className="text-xl font-bold uppercase text-muted-foreground mb-4">No Requests Yet</h3>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
            <Link href="/post-request">Post Your First Request</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className="flex flex-col md:flex-row border-border/50 bg-card/40 hover:bg-card/80 transition-colors overflow-hidden relative">
              <div className={`w-1 h-full absolute top-0 left-0 ${req.status === 'open' ? 'bg-primary' : req.status === 'in_progress' ? 'bg-secondary' : req.status === 'completed' ? 'bg-green-500' : 'bg-muted'}`}></div>
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-bold text-white tracking-wide uppercase">{req.gameName}</h3>
                  <div className={`px-3 py-1 rounded-sm text-xs font-bold uppercase border ${
                    req.status === 'open' ? 'border-primary text-primary bg-primary/10' : 
                    req.status === 'in_progress' ? 'border-secondary text-secondary bg-secondary/10' : 
                    req.status === 'completed' ? 'border-green-500 text-green-500 bg-green-500/10' : 
                    'border-muted-foreground text-muted-foreground bg-muted/50'
                  }`}>
                    {req.status.replace("_", " ")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-background border border-border rounded text-xs font-mono text-muted-foreground">
                    {req.platform}
                  </span>
                  <span className="px-2 py-1 bg-background border border-border rounded text-xs font-mono text-muted-foreground">
                    {req.skillLevel}
                  </span>
                  <span className="px-2 py-1 text-xs text-muted-foreground flex items-center">
                    Posted {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 font-sans italic border-l-2 border-border pl-3 bg-background/30 py-2">
                  "{req.objectives}"
                </p>
              </div>
              <div className="p-6 bg-background/50 border-t md:border-t-0 md:border-l border-border flex flex-col justify-center gap-2 min-w-[200px]">
                {req.status === 'open' && (
                  <>
                    <Button variant="outline" className="w-full font-bold uppercase text-xs" disabled>Edit Request</Button>
                    <Button variant="destructive" className="w-full font-bold uppercase text-xs">Cancel Request</Button>
                  </>
                )}
                {req.status === 'in_progress' && (
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold uppercase text-xs">Mark Completed</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}