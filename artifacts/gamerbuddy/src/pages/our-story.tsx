import { Heart, Gamepad2, ExternalLink, Youtube, Twitch } from "lucide-react";
import { Link } from "wouter";

export default function OurStory() {
  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ── Header ── */}
        <div className="text-center space-y-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-2"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,211,238,0.15))",
              border: "1px solid rgba(168,85,247,0.30)",
              color: "#c084fc",
            }}
          >
            <Heart className="h-3 w-3" />
            Founder's Note
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #c084fc 40%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Our Story
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Why Gamerbuddy exists — and the game that started it all.
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* ── Main Story ── */}
        <div
          className="rounded-3xl border p-7 sm:p-9 space-y-6"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(34,211,238,0.04) 100%)",
            borderColor: "rgba(168,85,247,0.20)",
          }}
        >
          {/* Avatar / identity */}
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.20), rgba(34,211,238,0.20))",
                border: "1px solid rgba(168,85,247,0.35)",
              }}
            >
              🎮
            </div>
            <div>
              <p className="font-black text-foreground text-lg leading-tight">Suryakant Ojha</p>
              <p className="text-sm text-muted-foreground font-medium">
                Known as{" "}
                <span className="font-bold" style={{ color: "#a855f7" }}>
                  Dualshot66
                </span>{" "}
                in the gaming world
              </p>
            </div>
          </div>

          {/* Story paragraphs */}
          <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Hi, I'm Suryakant — known as{" "}
              <span className="text-foreground font-semibold">Dualshot66</span> in the gaming world.
            </p>

            <div
              className="rounded-2xl border-l-4 px-5 py-4 space-y-3"
              style={{
                borderLeftColor: "#a855f7",
                background: "rgba(168,85,247,0.06)",
              }}
            >
              <p>
                When I was in 9th grade, I was going through a very dark time. I felt completely alone
                and depressed, and had decided to end my life. I had even planned exactly how I would
                do it.
              </p>
              <p>
                The night before, a neighbor kid asked me to install{" "}
                <span className="text-foreground font-semibold">Assassin's Creed (2007)</span> on his
                PC. I installed it on mine first… and ended up playing for{" "}
                <span className="text-foreground font-semibold">6 straight hours</span>. That game gave
                me something to look forward to — the next mission, the next story.
              </p>
              <p>
                That small moment changed everything. Instead of going through with my plan, I stayed
                up playing. Gaming became my escape, my joy, and eventually my strongest friend. It
                pulled me out of depression and gave me a reason to keep going.
              </p>
            </div>

            <p>
              Years later, I still see so many gamers who feel lonely or frustrated with random
              matchmaking. That's why I created{" "}
              <span className="text-foreground font-semibold">Gamerbuddy</span> — to make it easier
              and safer for players to find reliable teammates for co-op, ranked practice, or casual
              sessions.
            </p>

            <p
              className="text-base font-semibold"
              style={{ color: "#c084fc" }}
            >
              Gaming saved me once. My hope is that this platform can help others feel less alone and
              create meaningful friendships through play.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Find me here
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://steamcommunity.com/profiles/76561198800662709/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(23,126,166,0.15)",
                  border: "1px solid rgba(23,126,166,0.35)",
                  color: "rgb(103,194,224)",
                }}
              >
                {/* Steam icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                </svg>
                Steam Profile
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="https://www.youtube.com/@Dualshot66"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,0,0,0.10)",
                  border: "1px solid rgba(255,0,0,0.28)",
                  color: "rgb(252,129,129)",
                }}
              >
                <Youtube className="h-4 w-4 shrink-0" />
                YouTube – Dualshot66
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Sign-off */}
          <div className="space-y-2">
            <p className="text-[15px] text-muted-foreground">
              Thank you for being part of this journey.<br />
              <span className="text-foreground font-semibold">
                Let's build a better gaming community together.
              </span>
            </p>
            <div className="pt-1">
              <p className="font-black text-foreground">— Suryakant Ojha</p>
              <p className="text-sm text-muted-foreground italic leading-relaxed mt-1">
                Just a random not so special gamer that believes gaming has the power to unite all of
                us no matter what nation, religion, colour etc.
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA: Join the Community ── */}
        <div
          className="rounded-2xl border p-6 text-center space-y-4"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(168,85,247,0.05) 100%)",
            borderColor: "rgba(34,211,238,0.20)",
          }}
        >
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#22d3ee" }}>
              Be Part of the Story
            </p>
            <h3 className="text-lg font-black text-foreground">
              Ready to find your gaming buddy?
            </h3>
            <p className="text-sm text-muted-foreground">
              Browse open requests, post your own, or sign up to join the community.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                boxShadow: "0 4px 20px rgba(168,85,247,0.30)",
              }}
            >
              <Gamepad2 className="h-4 w-4 shrink-0" />
              Browse Requests
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105 active:scale-95 text-foreground"
              style={{ borderColor: "rgba(168,85,247,0.40)", background: "rgba(168,85,247,0.06)" }}
            >
              Join Free
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
