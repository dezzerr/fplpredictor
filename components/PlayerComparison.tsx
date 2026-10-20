"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Player, Fixture } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";
import { Search, X, Plus, TrendingUp, Crown, ChevronRight } from "lucide-react";

const POS_COLORS: Record<string, string> = {
  GK: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  DEF: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  MID: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  FWD: "text-rose-400 border-rose-400/30 bg-rose-400/10",
};

function getFdrColor(diff: number) {
  if (diff <= 2) return "bg-emerald-500";
  if (diff === 3) return "bg-slate-500";
  if (diff === 4) return "bg-orange-500";
  return "bg-rose-500";
}

/* ── Tug-of-war stat bar ── */
function TugOfWarBar({ label, leftVal, rightVal, format }: {
  label: string; leftVal: number; rightVal: number; format?: (v: number) => string;
}) {
  const total = leftVal + rightVal;
  const leftPct = total > 0 ? (leftVal / total) * 100 : 50;
  const rightPct = 100 - leftPct;
  const fmt = format ?? ((v: number) => v.toFixed(1));
  const leftWins = leftVal > rightVal;
  const rightWins = rightVal > leftVal;

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-bold tabular-nums ${leftWins ? "text-violet-300" : "text-slate-400"}`}>{fmt(leftVal)}</span>
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${rightWins ? "text-cyan-300" : "text-slate-400"}`}>{fmt(rightVal)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-2">
        <div
          className="bg-gradient-to-r from-violet-600 to-violet-500 transition-all duration-700 ease-out"
          style={{ width: `${leftPct}%` }}
        />
        <div className="w-px bg-surface-border" />
        <div
          className="bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700 ease-out"
          style={{ width: `${rightPct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Mini radar chart (SVG) ── */
function RadarChart({ players }: { players: Player[] }) {
  const axes = ["Pts", "Form", "Price", "Owner", "Mins"];
  const values = players.map(p => {
    const pts = weeklyExp(p, 0);
    const form = p.form ?? 0;
    const price = p.price;
    const owner = p.ownership ?? 0;
    const mins = p.playingTime?.expectedMinutes ?? (p.minutesProb ?? 0) * 90;
    return [pts, form, price, owner, mins];
  });

  const maxes = axes.map((_, i) => Math.max(...values.map(v => v[i]), 0.1));
  const center = 120;
  const radius = 80;
  const angleStep = (Math.PI * 2) / axes.length;

  const getPoint = (val: number, idx: number, max: number) => {
    const r = (val / max) * radius;
    const angle = idx * angleStep - Math.PI / 2;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const colors = ["#A855F7", "#22D3EE", "#7C3AED", "#f59e0b"];

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto max-w-[240px] mx-auto">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon
          key={r}
          points={axes.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + radius * r * Math.cos(angle)},${center + radius * r * Math.sin(angle)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center} y1={center}
            x2={center + radius * Math.cos(angle)}
            y2={center + radius * Math.sin(angle)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}
      {/* Player polygons */}
      {values.map((vals, pi) => {
        const points = vals.map((v, i) => {
          const p = getPoint(v, i, maxes[i]);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <polygon
            key={pi}
            points={points}
            fill={colors[pi % colors.length]}
            fillOpacity="0.12"
            stroke={colors[pi % colors.length]}
            strokeWidth="2"
          />
        );
      })}
      {/* Axis labels */}
      {axes.map((label, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const lx = center + (radius + 16) * Math.cos(angle);
        const ly = center + (radius + 16) * Math.sin(angle);
        return (
          <text
            key={i}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Illustrated empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg viewBox="0 0 200 160" className="w-48 h-auto mb-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="empty-grad" x1="40" y1="20" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        {/* Two player silhouettes facing each other */}
        <circle cx="60" cy="50" r="18" fill="none" stroke="url(#empty-grad)" strokeWidth="2" />
        <path d="M42 90 Q60 70 78 90 L78 120 L42 120 Z" fill="none" stroke="url(#empty-grad)" strokeWidth="2" />
        <circle cx="140" cy="50" r="18" fill="none" stroke="url(#empty-grad)" strokeWidth="2" />
        <path d="M122 90 Q140 70 158 90 L158 120 L122 120 Z" fill="none" stroke="url(#empty-grad)" strokeWidth="2" />
        {/* VS in center */}
        <text x="100" y="58" textAnchor="middle" fill="url(#empty-grad)" fontSize="22" fontWeight="bold">VS</text>
        {/* Sparkle dots */}
        <circle cx="30" cy="30" r="2" fill="#A855F7" opacity="0.5" className="animate-pulse-glow" />
        <circle cx="170" cy="100" r="2" fill="#22D3EE" opacity="0.5" className="animate-pulse-glow" />
        <circle cx="100" cy="20" r="1.5" fill="#A855F7" opacity="0.4" />
      </svg>
      <h3 className="font-display text-xl font-bold text-white mb-2">Select players to compare</h3>
      <p className="text-sm text-slate-400 max-w-xs">
        Search and add up to 4 players to see head-to-head stats, fixture difficulty, and projected points.
      </p>
    </div>
  );
}

export function PlayerComparison() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [historyPlayer, setHistoryPlayer] = useState<Player | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/players")
      .then(res => res.json())
      .then((data: Player[]) => {
        setAllPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allPlayers
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.team.toLowerCase().includes(query) ||
        (p.teamName || p.team).toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [allPlayers, searchQuery]);

  const addPlayer = (player: Player) => {
    if (selectedPlayers.length >= 4) return;
    if (selectedPlayers.find(p => p.id === player.id)) return;
    setSelectedPlayers([...selectedPlayers, player]);
    setSearchQuery("");
    setShowSearch(false);
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
  };

  /* Verdict — only for exactly 2 players */
  const verdict = useMemo(() => {
    if (selectedPlayers.length !== 2) return null;
    const [a, b] = selectedPlayers;
    const ptsA = weeklyExp(a, 0);
    const ptsB = weeklyExp(b, 0);
    if (Math.abs(ptsA - ptsB) < 0.5) {
      return { text: "Too close to call — both players project similarly.", winner: null as Player | null };
    }
    const winner = ptsA > ptsB ? a : b;
    const diff = Math.abs(ptsA - ptsB).toFixed(1);
    return { text: `${winner.name} is the better pick by ${diff} pts.`, winner };
  }, [selectedPlayers]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Versus hero header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-1 p-6 mb-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-brand-cta flex items-center justify-center shadow-glow-brand shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Player Comparison</h1>
            <p className="text-sm text-slate-400">Head-to-head stats, fixtures, and projected points</p>
          </div>
        </div>
      </div>

      {/* ── Command-palette style search ── */}
      <div className="mb-6">
        {showSearch ? (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by player name or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); }
                if (e.key === "Enter" && searchResults[0]) addPlayer(searchResults[0]);
              }}
              className="w-full pl-12 pr-12 py-3.5 bg-surface-1 border border-surface-border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(""); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-surface-1 border border-surface-border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.map((player, idx) => (
                  <button
                    key={player.id}
                    onClick={() => addPlayer(player)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 text-left transition-colors ${idx === 0 ? "bg-surface-2/50" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-bold ${POS_COLORS[player.position] || "text-slate-400 border-slate-600 bg-slate-700"}`}>
                      {player.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{player.name}</div>
                      <div className="text-xs text-slate-500">{player.teamName || player.team} &bull; &pound;{player.price.toFixed(1)}m</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-cyan-400 font-bold text-sm tabular-nums">{weeklyExp(player, 0).toFixed(1)}</div>
                      <div className="text-[10px] text-slate-500">pts</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            disabled={selectedPlayers.length >= 4}
            className="w-full py-3.5 border border-dashed border-surface-border rounded-xl text-slate-400 font-medium flex items-center justify-center gap-2 hover:border-violet-500/40 hover:text-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Player to Compare ({selectedPlayers.length}/4)
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {selectedPlayers.length === 0 && !loading && <EmptyState />}

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500 text-sm animate-pulse">Loading players...</div>
        </div>
      )}

      {/* ── Comparison content ── */}
      {selectedPlayers.length > 0 && (
        <div className="space-y-6">
          {/* Player selector chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {selectedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="relative bg-surface-1 border border-surface-border rounded-xl p-4 group hover:border-violet-500/30 transition-colors"
              >
                <button
                  onClick={() => removePlayer(player.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border mb-2 ${POS_COLORS[player.position] || "text-slate-400 border-slate-600 bg-slate-700"}`}>
                  {player.position}
                </div>
                <div className="font-semibold text-white text-sm truncate pr-6">{player.name}</div>
                <div className="text-xs text-slate-500 mb-2">{player.teamName || player.team}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-cyan-400 tabular-nums">&pound;{player.price.toFixed(1)}m</span>
                  <span className="text-xs text-slate-500 tabular-nums">{weeklyExp(player, 0).toFixed(1)} pts</span>
                </div>
                {/* Color indicator dot for radar/tug-of-war */}
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full" style={{
                  background: ["#A855F7", "#22D3EE", "#7C3AED", "#f59e0b"][idx % 4]
                }} />
              </div>
            ))}
          </div>

          {/* ── Verdict card (2 players only) ── */}
          {verdict && (
            <div className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-1 p-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/8 rounded-full blur-[60px] pointer-events-none" />
              <div className="relative flex items-center gap-3">
                {verdict.winner ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-brand-cta flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-violet-400 font-semibold">Verdict</div>
                      <div className="text-white font-medium text-sm">{verdict.text}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Verdict</div>
                      <div className="text-slate-300 font-medium text-sm">{verdict.text}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Tug-of-war stat bars (2 players) ── */}
          {selectedPlayers.length === 2 && (
            <div className="rounded-xl border border-surface-border bg-surface-1 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span className="text-sm font-medium text-white truncate max-w-[120px]">{selectedPlayers[0].name}</span>
                </div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Head to Head</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate max-w-[120px]">{selectedPlayers[1].name}</span>
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                </div>
              </div>
              <TugOfWarBar label="Pred. Pts" leftVal={weeklyExp(selectedPlayers[0], 0)} rightVal={weeklyExp(selectedPlayers[1], 0)} />
              <TugOfWarBar label="Form" leftVal={selectedPlayers[0].form ?? 0} rightVal={selectedPlayers[1].form ?? 0} />
              <TugOfWarBar label="Price" leftVal={selectedPlayers[0].price} rightVal={selectedPlayers[1].price} format={(v) => `£${v.toFixed(1)}m`} />
              <TugOfWarBar label="Ownership" leftVal={selectedPlayers[0].ownership ?? 0} rightVal={selectedPlayers[1].ownership ?? 0} format={(v) => `${v.toFixed(1)}%`} />
              <TugOfWarBar label="Exp. mins" leftVal={selectedPlayers[0].playingTime?.expectedMinutes ?? (selectedPlayers[0].minutesProb ?? 0) * 90} rightVal={selectedPlayers[1].playingTime?.expectedMinutes ?? (selectedPlayers[1].minutesProb ?? 0) * 90} format={(v) => `${v.toFixed(0)}`} />
            </div>
          )}

          {/* ── Radar chart (2+ players) ── */}
          {selectedPlayers.length >= 2 && (
            <div className="rounded-xl border border-surface-border bg-surface-1 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Performance Radar</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <RadarChart players={selectedPlayers} />
                <div className="space-y-2">
                  {selectedPlayers.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{
                        background: ["#A855F7", "#22D3EE", "#7C3AED", "#f59e0b"][idx % 4]
                      }} />
                      <span className="text-sm text-slate-300 truncate">{p.name}</span>
                      <span className="text-xs text-slate-500 ml-auto tabular-nums">{weeklyExp(p, 0).toFixed(1)} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stats table (3+ players) ── */}
          {selectedPlayers.length > 2 && (
            <div className="rounded-xl border border-surface-border bg-surface-1 overflow-hidden">
              <div className="bg-surface-2 px-4 py-2.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-white">Stats Comparison</h3>
              </div>
              <div className="divide-y divide-surface-border">
                {[
                  { label: "Pred. Pts", get: (p: Player) => weeklyExp(p, 0).toFixed(1) },
                  { label: "Form", get: (p: Player) => p.form?.toFixed(1) ?? "-" },
                  { label: "Price", get: (p: Player) => `£${p.price.toFixed(1)}m` },
                  { label: "Ownership", get: (p: Player) => p.ownership ? `${p.ownership.toFixed(1)}%` : "-" },
                  { label: "Exp. mins", get: (p: Player) => `${(p.playingTime?.expectedMinutes ?? (p.minutesProb ?? 0) * 90).toFixed(0)}` },
                  { label: "Starts", get: (p: Player) => `${((p.playingTime?.startProbability ?? p.minutesProb ?? 0) * 100).toFixed(0)}%` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center px-4 py-3">
                    <div className="w-24 text-xs text-slate-500 font-medium">{row.label}</div>
                    <div className="flex-1 flex gap-2">
                      {selectedPlayers.map(p => (
                        <div key={p.id} className="flex-1 text-center">
                          <span className="font-semibold text-white tabular-nums">{row.get(p)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Fixtures comparison ── */}
          <div className="rounded-xl border border-surface-border bg-surface-1 overflow-hidden">
            <div className="bg-surface-2 px-4 py-2.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-white">Next Fixtures</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectedPlayers.map(player => {
                  const fixtures = player.nextFixtures.slice(0, 5);
                  const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
                  for (const fix of fixtures) {
                    const last = groups[groups.length - 1];
                    if (last && fix.event != null && last.event === fix.event) {
                      last.fixtures.push(fix);
                    } else {
                      groups.push({ event: fix.event, fixtures: [fix] });
                    }
                  }
                  return (
                    <div key={player.id} className="space-y-2">
                      <div className="text-xs text-slate-500 truncate font-medium">{player.name.split(" ").pop()}</div>
                      {groups.slice(0, 3).map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          {group.fixtures.length >= 2 && (
                            <div className="text-center">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/20 text-violet-300 leading-none">DGW</span>
                            </div>
                          )}
                          {group.fixtures.map((fixture, fIdx) => (
                            <div
                              key={fIdx}
                              className={`${getFdrColor(fixture.diff)} text-white text-center py-1.5 rounded text-xs font-medium`}
                            >
                              {fixture.opp} ({fixture.H ? "H" : "A"})
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance history dialog ── */}
      <Dialog open={!!historyPlayer} onOpenChange={(open) => !open && setHistoryPlayer(null)}>
        <DialogContent className="bg-surface-1 border-surface-border">
          <DialogHeader>
            <DialogTitle className="text-white">{historyPlayer?.name} — Recent Form</DialogTitle>
            <DialogDescription className="text-slate-400">
              Points scored over recent gameweeks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Form: {historyPlayer?.form?.toFixed(1) ?? "N/A"}</p>
            <p className="text-sm text-slate-400">
              Predicted: {historyPlayer ? weeklyExp(historyPlayer, 0).toFixed(1) : "0"} pts next GW
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
