"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLiveGwContext } from "@/components/LiveGwProvider";
import { LiveBadge } from "@/components/LiveBadge";

interface MobileHeaderProps {
  title: string;
  gameweek: number;
  deadline: string;
  showBack?: boolean;
}

export function MobileHeader({ title, gameweek, deadline, showBack = true }: MobileHeaderProps) {
  const router = useRouter();
  const { isLive } = useLiveGwContext();

  return (
    <header className="sticky top-0 z-50 bg-slate-900">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="w-10">
          {showBack && (
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 text-slate-400 hover:text-white"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <div className="w-10" />
      </div>
      
      {/* Gameweek Info */}
      <div className="px-4 py-1.5 text-center bg-slate-800 border-b border-slate-700/50">
        <p className="text-xs font-medium text-slate-300 flex items-center justify-center gap-2">
          <span>
            Gameweek {gameweek}
            <span className="mx-2 text-slate-500">•</span>
            <span className="text-slate-400">{isLive ? '' : 'Deadline: '}{deadline}</span>
          </span>
          {isLive && <LiveBadge size="sm" />}
        </p>
      </div>
    </header>
  );
}
