"use client";

import { cn } from "@/lib/utils";

interface PitchListToggleProps {
  activeView: "pitch" | "list";
  onViewChange: (view: "pitch" | "list") => void;
}

export function PitchListToggle({ activeView, onViewChange }: PitchListToggleProps) {
  return (
    <div className="flex items-center justify-center px-4 py-2">
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
        <button
          onClick={() => onViewChange("pitch")}
          className={cn(
            "px-8 py-2 text-sm font-semibold rounded-md transition-all",
            activeView === "pitch"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Pitch
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={cn(
            "px-8 py-2 text-sm font-semibold rounded-md transition-all",
            activeView === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          List
        </button>
      </div>
    </div>
  );
}
