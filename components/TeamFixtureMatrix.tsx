"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Loader2, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface TeamFixture {
  gw: number;
  opponent: string;
  home: boolean;
  difficulty: number;
}

interface TeamData {
  team: string;
  teamName: string;
  fixtures: TeamFixture[];
  fdrAvg: number;
  fdrRating: string;
}

/* Difficulty → gradient + label */
function diffStyle(diff: number): { bg: string; label: string } {
  if (diff <= 2) return { bg: "from-emerald-500/80 to-emerald-600/80", label: "Easy" };
  if (diff === 3) return { bg: "from-slate-500/60 to-slate-600/60", label: "Mod" };
  if (diff === 4) return { bg: "from-orange-500/70 to-orange-600/70", label: "Hard" };
  return { bg: "from-rose-500/70 to-rose-600/70", label: "V.Hard" };
}

function ratingColor(rating: string): string {
  if (rating === "Excellent") return "text-emerald-400";
  if (rating === "Good") return "text-cyan-400";
  if (rating === "Average") return "text-slate-400";
  if (rating === "Difficult") return "text-orange-400";
  return "text-rose-400";
}

export function TeamFixtureMatrix() {
  const [data, setData] = useState<{ teams: TeamData[]; currentEvent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gwRange, setGwRange] = useState(8);

  useEffect(() => {
    fetch("/api/fixtures")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch fixtures");
        return res.json();
      })
      .then((d: { teams: TeamData[]; currentEvent: number }) => {
        setData(d);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  /* All unique GWs across all teams */
  const allGws = useMemo(() => {
    if (!data) return [];
    const gwSet = new Set<number>();
    data.teams.forEach(t => t.fixtures.forEach(f => f.gw && gwSet.add(f.gw)));
    return Array.from(gwSet).sort((a, b) => a - b).slice(0, gwRange);
  }, [data, gwRange]);

  /* Sorted teams by FDR (best first) */
  const sortedTeams = useMemo(() => {
    if (!data) return [];
    return [...data.teams].sort((a, b) => a.fdrAvg - b.fdrAvg);
  }, [data]);

  /* Summary insights */
  const insights = useMemo(() => {
    if (!sortedTeams.length) return [];
    const best = sortedTeams.slice(0, 3);
    const worst = sortedTeams.slice(-3).reverse();
    return [
      ...best.map(t => ({ team: t.team, rating: t.fdrRating, avg: t.fdrAvg, positive: true })),
      ...worst.map(t => ({ team: t.team, rating: t.fdrRating, avg: t.fdrAvg, positive: false })),
    ];
  }, [sortedTeams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        <span className="ml-3 text-slate-400 text-sm">Loading fixtures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mb-3" />
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || !data.teams.length) return null;

  return (
    <div className="space-y-4">
      {/* ── Summary strip with insights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={`rounded-lg border p-2.5 ${
              ins.positive
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-rose-500/20 bg-rose-500/5"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {ins.positive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              )}
              <span className="text-xs font-bold text-white">{ins.team}</span>
            </div>
            <div className={`text-[10px] ${ratingColor(ins.rating)}`}>
              {ins.rating} ({ins.avg.toFixed(1)})
            </div>
          </div>
        ))}
      </div>

      {/* ── GW range slider ── */}
      <div className="flex items-center gap-3 px-1">
        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-xs text-slate-400 font-medium shrink-0">GW Range</span>
        <input
          type="range"
          min={3}
          max={8}
          value={gwRange}
          onChange={e => setGwRange(Number(e.target.value))}
          className="flex-1 max-w-[200px] accent-violet-500 cursor-pointer"
        />
        <span className="text-xs font-bold text-violet-300 tabular-nums shrink-0">{gwRange} GWs</span>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 flex-wrap px-1">
        {[
          { label: "Easy", bg: "from-emerald-500/80 to-emerald-600/80" },
          { label: "Moderate", bg: "from-slate-500/60 to-slate-600/60" },
          { label: "Hard", bg: "from-orange-500/70 to-orange-600/70" },
          { label: "Very Hard", bg: "from-rose-500/70 to-rose-600/70" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded bg-gradient-to-br ${l.bg}`} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Fixture matrix ── */}
      <div className="rounded-xl border border-surface-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* GW header row */}
            <thead>
              <tr className="border-b border-surface-border">
                <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-semibold min-w-[80px]">
                  Team
                </th>
                {allGws.map(gw => (
                  <th
                    key={gw}
                    className="px-1 py-2.5 text-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold min-w-[44px]"
                  >
                    GW{gw}
                  </th>
                ))}
                <th className="px-2 py-2.5 text-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold min-w-[50px]">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => (
                <tr
                  key={team.team}
                  className={`border-b border-surface-border/50 hover:bg-surface-2/30 transition-colors ${idx % 2 === 0 ? "" : "bg-surface-2/20"}`}
                >
                  {/* Sticky team column */}
                  <td className="sticky left-0 z-10 bg-surface-1 px-3 py-2 group">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{team.team}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">{team.teamName}</div>
                  </td>
                  {/* Fixture cells */}
                  {allGws.map(gw => {
                    const fix = team.fixtures.find(f => f.gw === gw);
                    if (!fix) {
                      return (
                        <td key={gw} className="px-1 py-1.5 text-center">
                          <div className="w-9 h-9 rounded-lg bg-surface-2/50 border border-surface-border/30 flex items-center justify-center">
                            <span className="text-[8px] text-slate-600">—</span>
                          </div>
                        </td>
                      );
                    }
                    const ds = diffStyle(fix.difficulty);
                    return (
                      <td key={gw} className="px-1 py-1.5 text-center">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${ds.bg} flex flex-col items-center justify-center shadow-sm transition-transform hover:scale-110 cursor-default`}
                          title={`${fix.opponent} (${fix.home ? "H" : "A"}) — ${ds.label}`}
                        >
                          <span className="text-[9px] font-bold text-white leading-none">{fix.opponent}</span>
                          <span className="text-[8px] text-white/70 leading-none mt-0.5">{fix.home ? "H" : "A"}</span>
                        </div>
                      </td>
                    );
                  })}
                  {/* FDR average */}
                  <td className="px-2 py-2 text-center">
                    <span className={`text-xs font-bold tabular-nums ${ratingColor(team.fdrRating)}`}>
                      {team.fdrAvg.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
