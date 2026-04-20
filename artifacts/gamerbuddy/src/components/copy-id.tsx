import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyIdProps {
  id: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function CopyId({ id, size = "md", className }: CopyIdProps) {
  const [copied, setCopied] = useState(false);

  if (!id) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = id;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSmall = size === "sm";

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy User ID: ${id}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all select-none group",
        isSmall
          ? "px-2 py-0.5 text-[10px] gap-1"
          : "px-3 py-1 text-xs",
        copied
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-primary/20 bg-primary/5 text-primary/70 hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
        className,
      )}
    >
      <span className="font-mono font-semibold tracking-wider">{id}</span>
      {copied ? (
        <Check className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
      ) : (
        <Copy className={cn("shrink-0 opacity-60 group-hover:opacity-100 transition-opacity", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
      )}
      {copied && (
        <span className="text-emerald-400 font-medium">Copied!</span>
      )}
    </button>
  );
}
