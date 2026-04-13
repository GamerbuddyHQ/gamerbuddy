import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Gamepad2, Users, Coins, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12">
      <div className="space-y-6 max-w-3xl">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
          <Gamepad2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          Level Up Your <span className="text-primary">Squad</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The elite marketplace for gamers. Hire pro players to carry you, or find chill teammates for co-op. Get paid to play the games you love.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button size="lg" asChild className="text-lg px-8 py-6 rounded-none border-2 border-primary bg-primary/20 hover:bg-primary text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Link href="/signup">Join the Lair</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 rounded-none border-2 hover:bg-white/5">
            <Link href="/browse">Browse Requests</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-16">
        <div className="p-8 border border-border bg-card/50 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-secondary/10 rounded-full">
            <Users className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wide">Find Teammates</h3>
          <p className="text-muted-foreground">Post requests for any game, platform, and skill level. Find the exact match for your next session.</p>
        </div>
        
        <div className="p-8 border border-border bg-card/50 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Coins className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wide">Get Paid to Play</h3>
          <p className="text-muted-foreground">Accept requests, complete gaming sessions, and withdraw your earnings directly to your bank.</p>
        </div>

        <div className="p-8 border border-border bg-card/50 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-destructive/10 rounded-full">
            <Zap className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wide">Instant Action</h3>
          <p className="text-muted-foreground">No waiting around. Browse open requests, accept them instantly, and jump right into the game.</p>
        </div>
      </div>
    </div>
  );
}