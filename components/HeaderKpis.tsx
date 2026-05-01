"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDeadline, getMockDeadline } from "@/lib/date";
import { useSquadStore } from "@/store/squad";
import { ChevronLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLiveGwContext } from "@/components/LiveGwProvider";
import { LiveBadge } from "@/components/LiveBadge";
import { parseGameweek, resolveSelectedGameweek } from "@/lib/gameweek";

function HeaderLiveBadge() {
  const { isLive } = useLiveGwContext();
  if (!isLive) return null;
  return <LiveBadge size="md" />;
}

export function HeaderKpis({ compact = false, onGwChange, weekPredPts }: { compact?: boolean; onGwChange?: (offset: number) => void; weekPredPts?: number } = {}) {
  const [mounted, setMounted] = useState(false);
  const [deadline, setDeadline] = useState<Date>(getMockDeadline());
  const [eventName, setEventName] = useState<string>("Gameweek");
  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [gwOffset, setGwOffset] = useState<number>(0);
  const selectedGameweek = resolveSelectedGameweek(currentGw, gwOffset);
  
  useEffect(() => { 
    setMounted(true);
    fetch('/api/deadline')
      .then(res => res.json())
      .then(data => {
        setDeadline(new Date(data.deadline));
        if (typeof data.eventName === "string") {
          setEventName(data.eventName);
        }
        const eventId = parseGameweek(data.eventId);
        if (eventId !== null) setCurrentGw(eventId);
      })
      .catch(err => {
        console.error('Failed to fetch deadline:', err);
      });
  }, []);
  
  const deadlineText = mounted ? formatDeadline(deadline, "").replace(eventName, "").trim() : "";

  const syncPrices = useSquadStore((s) => s.syncPrices);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const players = await res.json();
        syncPrices(players);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = useSquadStore((s) => s.reset);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to log out: ' + error.message);
      } else {
        // Clear squad store to prevent data leakage to next user
        reset();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Title Bar - Compact with larger title */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="w-10">
          <Link href="/" className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Pick Team</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button
            onClick={handleLogout}
            className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
          >
            Log Out
          </button>
        </div>
      </div>
      
      {/* Gameweek Info - Center aligned with green background */}
      {!compact && (
        <div className="max-w-xl mx-auto px-4" suppressHydrationWarning>
          <div className="bg-emerald-50 rounded-lg px-4 py-2 mt-2 text-center">
            <p className="text-sm font-semibold text-emerald-700 flex items-center justify-center gap-2">
              <span>
                <span suppressHydrationWarning>{typeof selectedGameweek === "number" ? `Gameweek ${selectedGameweek}` : "Gameweek loading"}</span>
                <span className="mx-2 text-emerald-400">•</span>
                <span className="font-normal text-emerald-600" suppressHydrationWarning>Deadline: {deadlineText}</span>
              </span>
              <HeaderLiveBadge />
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
