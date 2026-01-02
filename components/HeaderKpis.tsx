"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDeadline, getMockDeadline } from "@/lib/date";
import { useSquadStore } from "@/store/squad";
import { ChevronLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function HeaderKpis({ compact = false, onGwChange, weekPredPts }: { compact?: boolean; onGwChange?: (offset: number) => void; weekPredPts?: number } = {}) {
  const [mounted, setMounted] = useState(false);
  const [deadline, setDeadline] = useState<Date>(getMockDeadline());
  const [eventName, setEventName] = useState<string>("Gameweek");
  const [currentGw, setCurrentGw] = useState<number>(8);
  const [gwOffset, setGwOffset] = useState<number>(0);
  
  useEffect(() => { 
    setMounted(true);
    fetch('/api/deadline')
      .then(res => res.json())
      .then(data => {
        setDeadline(new Date(data.deadline));
        if (typeof data.eventName === "string") {
          setEventName(data.eventName);
        }
        if (typeof data.eventId === "number") {
          setCurrentGw(data.eventId);
        } else {
          const parsedId = parseInt(String(data.eventId), 10);
          if (!Number.isNaN(parsedId)) {
            setCurrentGw(parsedId);
          } else if (typeof data.eventName === "string") {
            const match = data.eventName.match(/\d+/);
            if (match) setCurrentGw(parseInt(match[0], 10));
          }
        }
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

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to log out: ' + error.message);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Title Bar - Clean white like mobile */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="w-10">
          <Link href="/" className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </div>
        <h1 className="text-lg font-bold text-gray-900">Pick Team</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
          >
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
          >
            Log Out
          </button>
        </div>
      </div>
      
      {/* Gameweek Info - Clean center aligned */}
      {!compact && (
        <div className="px-4 py-2 text-center border-b border-gray-100" suppressHydrationWarning>
          <p className="text-sm font-semibold text-purple-700">
            <span suppressHydrationWarning>Gameweek {currentGw + gwOffset}</span>
            <span className="mx-2 text-gray-400">•</span>
            <span className="font-normal text-gray-600" suppressHydrationWarning>Deadline: {deadlineText}</span>
          </p>
        </div>
      )}
    </header>
  );
}
