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
    <header className="sticky top-0 z-50 bg-white">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="w-10">
          {showBack && (
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <div className="w-10" />
      </div>
      
      {/* Gameweek Info */}
      <div className="px-4 py-2 text-center border-b border-gray-100">
        <p className="text-sm font-semibold text-purple-700 flex items-center justify-center gap-2">
          <span>
            Gameweek {gameweek}
            <span className="mx-2 text-gray-400">•</span>
            <span className="font-normal text-gray-600">{isLive ? '' : 'Deadline: '}{deadline}</span>
          </span>
          {isLive && <LiveBadge size="md" />}
        </p>
      </div>
    </header>
  );
}
