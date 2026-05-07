"use client";

import { Fixture } from "@/lib/data";
import { cn } from "@/lib/utils";

interface FixtureBadgesProps {
  fixtures: Fixture[];
  maxShow?: number;
  size?: "sm" | "md";
}

// Get background color based on fixture difficulty rating (FDR)
function getFDRColor(diff: number): string {
  switch (diff) {
    case 1: return "bg-emerald-500 text-white"; // Very easy
    case 2: return "bg-green-400 text-white";   // Easy
    case 3: return "bg-amber-400 text-gray-900"; // Medium
    case 4: return "bg-orange-500 text-white";  // Hard
    case 5: return "bg-red-600 text-white";     // Very hard
    default: return "bg-gray-400 text-white";
  }
}

export function FixtureBadges({ fixtures, maxShow = 5, size = "sm" }: FixtureBadgesProps) {
  const displayFixtures = fixtures.slice(0, maxShow);
  
  if (!displayFixtures.length) {
    return <span className="text-xs text-muted-foreground">No fixtures</span>;
  }

  const sizeClasses = size === "sm" 
    ? "text-[9px] px-1.5 py-0.5 min-w-[28px]" 
    : "text-[10px] px-2 py-1 min-w-[32px]";

  // Group fixtures by event for DGW display
  const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
  for (const fix of displayFixtures) {
    const last = groups[groups.length - 1];
    if (last && fix.event != null && last.event === fix.event) {
      last.fixtures.push(fix);
    } else {
      groups.push({ event: fix.event, fixtures: [fix] });
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className={cn(
          "flex items-center gap-0.5",
          group.fixtures.length >= 2 && "ring-1 ring-blue-400 rounded px-0.5"
        )}>
          {group.fixtures.map((fix, fIdx) => (
            <div
              key={fIdx}
              className={cn(
                "rounded font-semibold text-center uppercase",
                getFDRColor(fix.diff),
                sizeClasses
              )}
              title={`${fix.opp} (${fix.H ? "H" : "A"}) - FDR: ${fix.diff}${group.fixtures.length >= 2 ? ' (DGW)' : ''}`}
            >
              {fix.opp}
              <span className="text-[7px] opacity-80 ml-0.5">{fix.H ? "H" : "A"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
