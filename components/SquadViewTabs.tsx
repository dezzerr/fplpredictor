"use client";

import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type SquadView = "squad" | "find";

interface SquadViewTabsProps {
  value: SquadView;
  onChange: (value: SquadView) => void;
}

export function SquadViewTabs({ value, onChange }: SquadViewTabsProps) {
  return (
    <div
      aria-label="Team view navigation"
      className="inline-flex w-full max-w-md rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "squad"}
        onClick={() => onChange("squad")}
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
          value === "squad"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Users className="h-4 w-4" />
        Team View
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "find"}
        onClick={() => onChange("find")}
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
          value === "find"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
        )}
      >
        <Search className="h-4 w-4" />
        Find Player
      </button>
    </div>
  );
}
