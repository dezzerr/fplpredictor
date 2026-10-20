"use client";

import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function LiveBadge({ className, size = "sm" }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold uppercase tracking-wide text-red-600",
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      LIVE
    </span>
  );
}
