"use client";

import { useState, useEffect } from "react";
import { useSquadStore } from "@/store/squad";
import { Shield, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ManagerData {
  teamName: string;
  playerName: string;
  region: string;
  regionIso: string;
  overallPoints: number;
  overallRank: number;
  totalPlayers: number;
  gwPoints: number;
  currentEvent: number;
  classicLeagues: Array<{
    id: number;
    name: string;
    rank: number;
    lastRank: number;
    movement: "up" | "down" | "same";
  }>;
}

export function ManagerSidebar() {
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const lastImport = useSquadStore((s) => s.lastImport);

  useEffect(() => {
    if (!lastImport?.entryId) {
      setLoading(false);
      return;
    }

    const fetchManagerData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/manager?entryId=${lastImport.entryId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch manager data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, [lastImport?.entryId]);

  if (loading) {
    return (
      <div className="w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-slate-100 rounded-lg" />
          <div className="h-32 bg-slate-100 rounded-lg" />
          <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-center py-8 text-slate-500 text-sm">
          Import your FPL team to see stats
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="w-64 space-y-3">
      {/* Team Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Shield className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{data.teamName}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              {data.playerName}
              {data.regionIso && (
                <span className="text-xs">
                  {getFlagEmoji(data.regionIso)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Points & Rankings */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Points & Rankings</h3>
            <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors">
              History
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-1 mt-2">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Overall points</span>
              <span className="font-bold text-slate-900">{formatNumber(data.overallPoints)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Overall rank</span>
              <span className="font-bold text-slate-900">{formatNumber(data.overallRank)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Total players</span>
              <span className="font-bold text-slate-900">{formatNumber(data.totalPlayers)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 text-sm">Gameweek points</span>
              <span className="font-bold text-indigo-600">{formatNumber(data.gwPoints)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classic Leagues */}
      {data.classicLeagues.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Classic Leagues</h3>
          
          <div className="space-y-1">
            {data.classicLeagues.map((league) => (
              <div
                key={league.id}
                className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
              >
                <span className="text-sm text-slate-600 truncate max-w-[140px]">
                  {league.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {formatNumber(league.rank)}
                  </span>
                  <MovementIndicator movement={league.movement} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MovementIndicator({ movement }: { movement: "up" | "down" | "same" }) {
  if (movement === "up") {
    return (
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
        <TrendingUp className="w-3 h-3 text-white" />
      </div>
    );
  }
  if (movement === "down") {
    return (
      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
        <TrendingDown className="w-3 h-3 text-white" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center">
      <Minus className="w-3 h-3 text-white" />
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
