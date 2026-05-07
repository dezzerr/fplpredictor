"use client";

import { useState, useEffect, useMemo } from "react";
import { Fixture } from "@/lib/data";
import type { Player } from "@/lib/data";
import { useFilters, MIN_PRICE, MAX_PRICE } from "@/store/filters";
import { useSquadStore } from "@/store/squad";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { TeamShirt } from "@/components/TeamShirt";
import { PlayerRow } from "@/components/PlayerRow";
import { getFPLDisplayName } from "@/lib/utils";
import { Search, RotateCcw, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { weeklyExp } from "@/lib/optimizer";

function PlayerModal({ player }: { player: Player }) {
  const [activeTab, setActiveTab] = useState<'history' | 'fixtures'>('history');

  return (
    <div className="space-y-2">
      {/* Compact Player Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-md p-2">
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
                    <div>Base: {player.expExplain.base.toFixed(1)}</div>
                    <div>Minutes: {(player.expExplain.minutesProb * 100).toFixed(0)}%</div>
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

export function PlayerFinder() {
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

  const squad = useSquadStore((s) => s.squad);
  const addPlayer = useSquadStore((s) => s.addPlayer);

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
    const res = addPlayer(p);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Find a player section */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Find a player</h2>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>

        {/* Filter row - wrap on mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <Select value={position === "ALL" ? "all" : position} onValueChange={(value) => setPosition(value === "all" ? "ALL" : value as any)}>
            <SelectTrigger className="w-[100px] sm:w-32 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="GK">GK</SelectItem>
              <SelectItem value="DEF">DEF</SelectItem>
              <SelectItem value="MID">MID</SelectItem>
              <SelectItem value="FWD">FWD</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[100px] sm:w-32 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXP_POINTS">Points</SelectItem>
              <SelectItem value="PRICE">Price</SelectItem>
              <SelectItem value="OWNERSHIP">Owned</SelectItem>
              <SelectItem value="FORM">Form</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`£${price[1]}m`} onValueChange={(value) => {
            const maxPrice = parseFloat(value.replace('£', '').replace('m', ''));
            setPrice([MIN_PRICE, maxPrice]);
          }}>
            <SelectTrigger className="w-[80px] sm:w-24 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="£16.0m">£16m</SelectItem>
              <SelectItem value="£14.0m">£14m</SelectItem>
              <SelectItem value="£12.0m">£12m</SelectItem>
              <SelectItem value="£10.0m">£10m</SelectItem>
              <SelectItem value="£8.0m">£8m</SelectItem>
              <SelectItem value="£6.0m">£6m</SelectItem>
              <SelectItem value="£4.0m">£4m</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={resetFilters} size="sm" className="gap-1 sm:gap-2 h-9 sm:h-10 px-2 sm:px-3">
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Players count banner */}
      <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-center py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base">
        {filtered.length} players
      </div>

      {/* Position filter tabs - compact on mobile */}
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => (
            <Button
              key={pos}
              variant={position === pos ? "default" : "outline"}
              onClick={() => setPosition(pos)}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              {pos}
            </Button>
          ))}
        </div>
      </div>

      {/* Teams filter - scrollable on mobile */}
      <div className="space-y-2">
        <h3 className="text-xs sm:text-sm font-medium text-gray-600">Teams</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-[120px] sm:max-h-none overflow-y-auto">
          {teams.slice(0, 20).map((team) => (
            <Button
              key={team}
              variant={teamFilter === team ? "default" : "ghost"}
              onClick={() => setTeamFilter(teamFilter === team ? "all" : team)}
              size="sm"
              className="gap-1 h-auto p-1.5 sm:p-2"
            >
              <TeamShirt team={team} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-xs">{team}</span>
            </Button>
          ))}
        </div>
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
                Showing {currentPage * PLAYERS_PER_PAGE + 1}-{Math.min((currentPage + 1) * PLAYERS_PER_PAGE, filtered.length)} of {filtered.length}
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
