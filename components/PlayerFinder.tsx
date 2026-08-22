"use client";

import { useState, useEffect, useMemo } from "react";
import { Fixture } from "@/lib/data";
import type { Player, Position } from "@/lib/data";
import { useFilters, MIN_PRICE, MAX_PRICE } from "@/store/filters";
import { useSquadStore } from "@/store/squad";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { TeamShirt } from "@/components/TeamShirt";
import { PlayerRow } from "@/components/PlayerRow";
import { getFPLDisplayName } from "@/lib/utils";
import { Search, RotateCcw, Info, X } from "lucide-react";
import { toast } from "sonner";
import { weeklyExp } from "@/lib/optimizer";

function PlayerModal({ player }: { player: Player }) {
  const [activeTab, setActiveTab] = useState<'history' | 'fixtures'>('history');

  return (
    <div className="space-y-2">
      {/* Compact Player Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-md p-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <TeamShirt team={player.team} className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs opacity-90">{player.position}</div>
            <div className="text-sm font-bold truncate">{getFPLDisplayName(player.name)}</div>
            <div className="text-xs opacity-90">{player.team}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-90">£{player.price.toFixed(1)}m</div>
            <div className="text-sm font-bold">{weeklyExp(player, 0).toFixed(1)} pts</div>
          </div>
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-gray-500">Form</div>
          <div className="font-bold">{player.form?.toFixed(1) || '-'}</div>
        </div>
        <div>
          <div className="text-gray-500">Own</div>
          <div className="font-bold">{player.ownership?.toFixed(1) || '-'}%</div>
        </div>
        <div>
          <div className="text-gray-500">EO</div>
          <div className="font-bold">{player.eo?.toFixed(1) || '-'}%</div>
        </div>
        <div>
          <div className="text-gray-500">Status</div>
          <div className="font-bold">
            {player.status === 'fit' ? '✓' : player.status === 'flag' ? '!' : '✗'}
          </div>
        </div>
      </div>

      {/* Compact Fixtures - DGW aware */}
      <div>
        <h3 className="font-bold text-xs text-gray-700 mb-1">Next Fixtures</h3>
        <div className="flex gap-2 justify-center">
          {(() => {
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
            return groups.slice(0, 3).map((group, gIdx) => (
              <div key={gIdx} className="text-center">
                <div className="text-xs text-gray-500 flex items-center justify-center gap-0.5">
                  GW{group.event || `+${gIdx + 1}`}
                  {group.fixtures.length >= 2 && (
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500 text-white leading-none">DGW</span>
                  )}
                </div>
                {group.fixtures.map((fixture, fIdx) => (
                  <div key={fIdx}>
                    <TeamShirt team={fixture.opp} className="w-6 h-6 mx-auto" />
                    <div className="text-xs font-medium">{fixture.opp} ({fixture.H ? 'H' : 'A'})</div>
                    <div className="text-xs font-bold">D:{fixture.diff}</div>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Compact Tabs */}
      <div className="border-t pt-2">
        <div className="flex gap-3 border-b text-xs">
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-1 ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'} font-medium`}
          >
            Summary
          </button>
          <button 
            onClick={() => setActiveTab('fixtures')}
            className={`pb-1 ${activeTab === 'fixtures' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'} font-medium`}
          >
            Fixtures
          </button>
        </div>
        
        <div className="mt-2">
          {activeTab === 'history' ? (
            <div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {player.form && (
                  <div>
                    <div className="text-gray-500">Form</div>
                    <div className="font-bold">{player.form.toFixed(1)}</div>
                  </div>
                )}
                {player.ownership && (
                  <div>
                    <div className="text-gray-500">Ownership</div>
                    <div className="font-bold">{player.ownership.toFixed(1)}%</div>
                  </div>
                )}
                {player.eo && (
                  <div>
                    <div className="text-gray-500">EO</div>
                    <div className="font-bold">{player.eo.toFixed(1)}%</div>
                  </div>
                )}
                {player.eoRisk && (
                  <div>
                    <div className="text-gray-500">EO Risk</div>
                    <div className="font-bold">{player.eoRisk.toFixed(1)}</div>
                  </div>
                )}
              </div>
              
              {player.expExplain && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="font-bold mb-1">Points Breakdown</div>
                  <div className="space-y-0.5">
                    <div>Projection base: {player.expExplain.base.toFixed(1)}</div>
                    {player.expExplain.projectionBaseSource === 'preseason-blend' && (
                      <div>
                        Official EP {player.expExplain.officialBase?.toFixed(1)} blended with last-season scoring
                      </div>
                    )}
                    <div>
                      Expected minutes: {(player.expExplain.playingTime?.expectedMinutes ?? player.expExplain.minutesProb * 90).toFixed(0)}
                    </div>
                    <div>
                      Start / 60+: {((player.expExplain.playingTime?.startProbability ?? player.expExplain.minutesProb) * 100).toFixed(0)}%
                      {' / '}{((player.expExplain.playingTime?.sixtyMinuteProbability ?? player.expExplain.minutesProb) * 100).toFixed(0)}%
                    </div>
                    <div>Form: {player.expExplain.formFactor.toFixed(2)}</div>
                    <div>Final: {player.expExplain.final.toFixed(1)} pts</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="space-y-1">
                {(() => {
                  const fixtures = player.nextFixtures.slice(0, 8);
                  const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
                  for (const fix of fixtures) {
                    const last = groups[groups.length - 1];
                    if (last && fix.event != null && last.event === fix.event) {
                      last.fixtures.push(fix);
                    } else {
                      groups.push({ event: fix.event, fixtures: [fix] });
                    }
                  }
                  return groups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-0.5">
                      {group.fixtures.map((fixture, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <div className="font-medium flex items-center gap-1">
                              GW{fixture.event || `+${gIdx + 1}`}
                              {group.fixtures.length >= 2 && fIdx === 0 && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500 text-white leading-none">DGW</span>
                              )}
                            </div>
                            <TeamShirt team={fixture.opp} className="w-4 h-4" />
                            <div>
                              <span className="font-medium">{fixture.opp}</span>
                              <span className="text-gray-500 ml-1">({fixture.H ? 'H' : 'A'})</span>
                            </div>
                          </div>
                          <div className="font-bold">
                            D:{fixture.diff}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PLAYERS_PER_PAGE = 10;

interface PlayerFinderProps {
  initialPosition?: Position | null;
  addToBench?: boolean;
}

export function PlayerFinder({ initialPosition, addToBench = false }: PlayerFinderProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error("Failed to fetch players");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e: any) {
        console.error("Failed to load live players", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load players");
          setPlayers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const search = useFilters((s) => s.search);
  const price = useFilters((s) => s.price);
  const auto = useFilters((s) => s.auto);
  const position = useFilters((s) => s.position);
  const sort = useFilters((s) => s.sort);
  const setSearch = useFilters((s) => s.setSearch);
  const setPrice = useFilters((s) => s.setPrice);
  const setAuto = useFilters((s) => s.setAuto);
  const setPosition = useFilters((s) => s.setPosition);
  const setSort = useFilters((s) => s.setSort);

  useEffect(() => {
    if (initialPosition) setPosition(initialPosition);
  }, [initialPosition, setPosition]);

  const squad = useSquadStore((s) => s.squad);
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const addPlayerToBench = useSquadStore((s) => s.addPlayerToBench);

  const inSquad = useMemo(() => new Set([
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ].map(p => p.id)), [squad]);

  const filtered = useMemo(() => {
    let list = players.filter(p => p.price >= price[0] && p.price <= price[1]);
    if (position !== "ALL") list = list.filter(p => p.position === position);
    if (teamFilter !== "all") list = list.filter(p => p.team === teamFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    if (auto) {
      list = list.filter(p => !inSquad.has(p.id));
    }

    // sorting
    if (sort === "PRICE") {
      list = list.slice().sort((a, b) => a.price - b.price);
    } else if (sort === "FIXTURE_EASE") {
      const ease = (p: Player) => {
        const diffs = p.nextFixtures?.map(f => f.diff) ?? [];
        if (!diffs.length) return 3;
        const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length;
        return avg; // lower = easier
      };
      list = list.slice().sort((a, b) => ease(a) - ease(b));
    } else if (sort === "FORM") {
      list = list.slice().sort((a, b) => (b.form ?? 0) - (a.form ?? 0));
    } else if (sort === "OWNERSHIP") {
      list = list.slice().sort((a, b) => (b.ownership ?? 0) - (a.ownership ?? 0));
    } else {
      // EXP_POINTS default - use weekly expected points (DGW/blank aware)
      list = list.slice().sort((a, b) => {
        const aExp = weeklyExp(a, 0);
        const bExp = weeklyExp(b, 0);
        return bExp - aExp;
      });
    }

    return list;
  }, [players, search, price, auto, inSquad, position, sort, teamFilter]);

  const handleAdd = (p: Player) => {
    const res = addToBench ? addPlayerToBench(p) : addPlayer(p);
    if (!res.ok) toast.error(res.reason);
    else toast.success(`Added ${p.name}`);
  };

  const teams = useMemo(() => Array.from(new Set(players.map(p => p.team))), [players]);

  const resetFilters = () => {
    setSearch("");
    setPosition("ALL");
    setSort("EXP_POINTS");
    setPrice([MIN_PRICE, MAX_PRICE]);
    setTeamFilter("all");
    setAuto(false);
    setCurrentPage(0);
  };

  // Calculate pagination for all players or specific position
  const { displayedPlayers, totalPages } = useMemo(() => {
    const startIndex = currentPage * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    
    return {
      displayedPlayers: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / PLAYERS_PER_PAGE)
    };
  }, [filtered, currentPage]);

  const positionNames = {
    GK: 'Goalkeepers',
    DEF: 'Defenders', 
    MID: 'Midfielders',
    FWD: 'Forwards'
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, price, teamFilter, sort, position]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">Squad builder</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Find Player</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Search by player or club, then add the right fit to your squad.
          </p>
        </div>
        <div className="hidden shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-right sm:block">
          <div className="text-lg font-bold text-slate-900">{filtered.length}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">available</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-colors focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100 sm:p-4">
        <label htmlFor="player-finder-search" className="sr-only">Search for a player or club</label>
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 shrink-0 text-violet-500" aria-hidden="true" />
          <Input
            id="player-finder-search"
            placeholder="Search player or club…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 border-0 bg-transparent px-0 text-base text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear player search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 pl-8 text-xs text-slate-400">Try a name or club, for example “Saka” or “Arsenal”.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={position === "ALL" ? "all" : position} onValueChange={(value) => setPosition(value === "all" ? "ALL" : value as any)}>
          <SelectTrigger className="h-10 w-[calc(50%-0.25rem)] rounded-xl border-slate-200 bg-white text-xs text-slate-700 sm:w-32 sm:text-sm">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            <SelectItem value="GK">Goalkeepers</SelectItem>
            <SelectItem value="DEF">Defenders</SelectItem>
            <SelectItem value="MID">Midfielders</SelectItem>
            <SelectItem value="FWD">Forwards</SelectItem>
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="h-10 w-[calc(50%-0.25rem)] rounded-xl border-slate-200 bg-white text-xs text-slate-700 sm:w-36 sm:text-sm">
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clubs</SelectItem>
            {teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-10 w-[calc(50%-0.25rem)] rounded-xl border-slate-200 bg-white text-xs text-slate-700 sm:w-32 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXP_POINTS">Expected points</SelectItem>
            <SelectItem value="PRICE">Price</SelectItem>
            <SelectItem value="OWNERSHIP">Ownership</SelectItem>
            <SelectItem value="FORM">Form</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`£${price[1].toFixed(1)}m`} onValueChange={(value) => {
          const maxPrice = parseFloat(value.replace('£', '').replace('m', ''));
          setPrice([MIN_PRICE, maxPrice]);
        }}>
          <SelectTrigger className="h-10 w-[calc(50%-0.25rem)] rounded-xl border-slate-200 bg-white text-xs text-slate-700 sm:w-24 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="£16.0m">Up to £16m</SelectItem>
            <SelectItem value="£14.0m">Up to £14m</SelectItem>
            <SelectItem value="£12.0m">Up to £12m</SelectItem>
            <SelectItem value="£10.0m">Up to £10m</SelectItem>
            <SelectItem value="£8.0m">Up to £8m</SelectItem>
            <SelectItem value="£6.0m">Up to £6m</SelectItem>
            <SelectItem value="£4.0m">Up to £4m</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={resetFilters} size="sm" className="h-10 gap-2 rounded-xl border-slate-200 px-3 text-slate-600">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
        <span className="font-semibold text-slate-700">{filtered.length} players match</span>
        {search && <span className="max-w-[55%] truncate text-xs text-slate-400">“{search}”</span>}
      </div>

      {/* Player display */}
      <div className="space-y-6">
        {loading && players.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading players...</div>
        ) : error && players.length === 0 ? (
          <div className="text-center py-8 text-red-500">Failed to load players: {error}</div>
        ) : (
          /* Unified Paginated Display */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {position === "ALL" ? "Top Players" : positionNames[position as keyof typeof positionNames]}
              </h3>
              <div className="text-sm text-gray-500">
                {filtered.length === 0
                  ? "No players found"
                  : `Showing ${currentPage * PLAYERS_PER_PAGE + 1}-${Math.min((currentPage + 1) * PLAYERS_PER_PAGE, filtered.length)} of ${filtered.length}`}
              </div>
            </div>
            
            <div className="space-y-2">
              {displayedPlayers?.map((player) => (
                <div key={player.id} className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 bg-blue-100 hover:bg-blue-200 rounded-full flex-shrink-0"
                      >
                        <Info className="h-4 w-4 text-blue-600" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogTitle className="sr-only">
                        {getFPLDisplayName(player.name)} - Player Details
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Detailed statistics and information for {getFPLDisplayName(player.name)}
                      </DialogDescription>
                      <PlayerModal player={player} />
                    </DialogContent>
                  </Dialog>
                  
                  <div className="flex-1 min-w-0">
                    <PlayerRow player={player} onAdd={handleAdd} />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
