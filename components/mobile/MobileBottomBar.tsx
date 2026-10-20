"use client";

import { cn } from "@/lib/utils";

interface MobileBottomBarProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function MobileBottomBar({ primaryAction, secondaryAction }: MobileBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-4 py-2 pb-safe">
      <div className="flex items-center gap-3 max-w-md mx-auto">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-full font-semibold text-sm transition-all shadow-sm",
              primaryAction.disabled
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]"
            )}
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-full font-semibold text-sm border-2 transition-all",
              secondaryAction.disabled
                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                : "border-slate-300 text-slate-600 hover:border-slate-400 active:scale-[0.98]"
            )}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
