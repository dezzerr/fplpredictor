"use client";

import { useState, useEffect, useMemo } from "react";
import { getRealisticExpPoints } from "@/lib/data";
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
import { Search, RotateCcw, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

function PlayerModal({ player }: { player: Player }) {
  const [activeTab, setActiveTab] = useState<'history' | 'fixtures'>('history');

  return (
    <div className="space-y-4">
      {/* Player Header */}
      <div className="bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <TeamShirt team={player.team} className="w-12 h-12" />
          </div>
          <div>
            <div className="text-sm opacity-90">{player.position}</div>
            <div className="text-xl font-bold">{getFPLDisplayName(player.name)}</div>
            <div className="text-sm opacity-90">{player.team}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 py-2">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Price</div>
          <div className="font-bold text-lg">£{player.price.toFixed(1)}m</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Form</div>
          <div className="font-bold text-lg">{player.form?.toFixed(1) || '-'}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Expected Pts</div>
          <div className="font-bold text-lg">{getRealisticExpPoints(player).toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Ownership</div>
          <div className="font-bold text-lg">{player.ownership?.toFixed(1) || '-'}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-2">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">EO</div>
          <div className="font-bold text-lg">{player.eo?.toFixed(1) || '-'}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">EO Risk</div>
          <div className="font-bold text-lg">{player.eoRisk?.toFixed(1) || '-'}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <div className="font-bold text-lg">
            {player.status === 'fit' ? '✓' : player.status === 'flag' ? '!' : '✗'}
          </div>
        </div>
      </div>

      {/* Fixtures Preview */}
      <div>
        <h3 className="font-bold text-black mb-3">Next Fixtures</h3>
        <div className="flex gap-3">
          {player.nextFixtures.slice(0, 3).map((fixture, i) => (
            <div key={i} className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {fixture.event ? `GW${fixture.event}` : `GW+${i + 1}`}
              </div>
              <TeamShirt team={fixture.opp} className="w-10 h-10 mx-auto mb-1" />
              <div className="text-xs font-medium">{fixture.opp} ({fixture.H ? 'H' : 'A'})</div>
              <div className="text-sm font-bold">Diff: {fixture.diff}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t pt-4">
        <div className="flex gap-4 border-b">
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-2 ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'} font-medium`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('fixtures')}
            className={`pb-2 ${activeTab === 'fixtures' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'} font-medium`}
          >
            Fixtures
          </button>
        </div>
        
        <div className="mt-4">
          {activeTab === 'history' ? (
            <div>
              <div className="font-bold text-black mb-3">Player Summary</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Expected Points</div>
                  <div className="font-bold">{getRealisticExpPoints(player).toFixed(1)} pts</div>
                </div>
                <div>
                  <div className="text-gray-500">Price</div>
                  <div className="font-bold">£{player.price.toFixed(1)}m</div>
                </div>
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
                    <div className="text-gray-500">Effective Ownership</div>
                    <div className="font-bold">{player.eo.toFixed(1)}%</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="font-bold capitalize">{player.status}</div>
                </div>
              </div>
              
              {player.expExplain && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="font-bold text-sm mb-2">Expected Points Breakdown</div>
                  <div className="text-xs space-y-1">
                    <div>Base: {player.expExplain.base.toFixed(1)} pts</div>
                    <div>Minutes Probability: {(player.expExplain.minutesProb * 100).toFixed(0)}%</div>
                    <div>Form Factor: {player.expExplain.formFactor.toFixed(2)}</div>
                    <div>Fixture Factor: {player.expExplain.blendedFixtureFactor.toFixed(2)}</div>
                    <div>Final: {player.expExplain.final.toFixed(1)} pts</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="font-bold text-black mb-3">Upcoming Fixtures</div>
              <div className="space-y-3">
                {player.nextFixtures.map((fixture, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {fixture.event ? `GW${fixture.event}` : `GW+${i + 1}`}
                      </div>
                      <TeamShirt team={fixture.opp} className="w-8 h-8" />
                      <div>
                        <div className="font-medium">{fixture.opp}</div>
                        <div className="text-xs text-gray-500">{fixture.H ? 'Home' : 'Away'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">Difficulty: {fixture.diff}</div>
                      <div className="text-xs text-gray-500">
                        {fixture.diff <= 2 ? 'Easy' : fixture.diff <= 3 ? 'Medium' : 'Hard'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const INITIAL_DISPLAY_COUNT = 5;

export function PlayerFinder() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [expandedPositions, setExpandedPositions] = useState<Record<string, boolean>>({});
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>({});

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
      // EXP_POINTS default - use realistic expected points with minutes probability
      list = list.slice().sort((a, b) => {
        const aExp = getRealisticExpPoints(a);
        const bExp = getRealisticExpPoints(b);
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
  };

  const groupedPlayers = useMemo(() => {
    const groups = {
      GK: filtered.filter(p => p.position === 'GK'),
      DEF: filtered.filter(p => p.position === 'DEF'),
      MID: filtered.filter(p => p.position === 'MID'),
      FWD: filtered.filter(p => p.position === 'FWD'),
    };
    return groups;
  }, [filtered]);

  const positionNames = {
    GK: 'Goalkeepers',
    DEF: 'Defenders', 
    MID: 'Midfielders',
    FWD: 'Forwards'
  };

  const togglePosition = (pos: string) => {
    setExpandedPositions(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  const showMore = (pos: string, currentCount: number) => {
    setDisplayCounts(prev => ({ ...prev, [pos]: currentCount + 5 }));
  };

  const getDisplayCount = (pos: string, totalCount: number) => {
    return displayCounts[pos] || Math.min(INITIAL_DISPLAY_COUNT, totalCount);
  };

  return (
    <div className="space-y-6">
      {/* Find a player section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Find a player</h2>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-3 items-center">
          <Select value={position === "ALL" ? "all" : position} onValueChange={(value) => setPosition(value === "all" ? "ALL" : value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All players</SelectItem>
              <SelectItem value="GK">Goalkeepers</SelectItem>
              <SelectItem value="DEF">Defenders</SelectItem>
              <SelectItem value="MID">Midfielders</SelectItem>
              <SelectItem value="FWD">Forwards</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXP_POINTS">Total points</SelectItem>
              <SelectItem value="PRICE">Price</SelectItem>
              <SelectItem value="OWNERSHIP">Ownership</SelectItem>
              <SelectItem value="FORM">Form</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`£${price[1]}m`} onValueChange={(value) => {
            const maxPrice = parseFloat(value.replace('£', '').replace('m', ''));
            setPrice([MIN_PRICE, maxPrice]);
          }}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="£15.0m">£15.0m</SelectItem>
              <SelectItem value="£12.0m">£12.0m</SelectItem>
              <SelectItem value="£10.0m">£10.0m</SelectItem>
              <SelectItem value="£8.0m">£8.0m</SelectItem>
              <SelectItem value="£6.0m">£6.0m</SelectItem>
              <SelectItem value="£4.0m">£4.0m</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={resetFilters} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Players count banner */}
      <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-center py-3 rounded-lg font-medium">
        {filtered.length} players shown
      </div>

      {/* Position tabs */}
      <Tabs value="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="all" className="text-gray-900">All players</TabsTrigger>
          <TabsTrigger value="watchlist" className="text-gray-500">Watchlist</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Position filter tabs */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Position</h3>
        <div className="grid grid-cols-4 gap-2">
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => (
            <Button
              key={pos}
              variant={position === pos ? "default" : "outline"}
              onClick={() => setPosition(pos)}
              className="text-sm"
            >
              {positionNames[pos]}
            </Button>
          ))}
        </div>
      </div>

      {/* Teams filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-600">Teams</h3>
        <div className="grid grid-cols-4 gap-3">
          {teams.slice(0, 20).map((team) => (
            <Button
              key={team}
              variant={teamFilter === team ? "default" : "ghost"}
              onClick={() => setTeamFilter(teamFilter === team ? "all" : team)}
              className="justify-start gap-2 h-auto p-2"
            >
              <TeamShirt team={team} className="w-5 h-5" />
              <span className="text-xs">{team}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Player lists by position */}
      <div className="space-y-6">
        {loading && players.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading players...</div>
        ) : error && players.length === 0 ? (
          <div className="text-center py-8 text-red-500">Failed to load players: {error}</div>
        ) : (
          Object.entries(groupedPlayers).map(([pos, posPlayers]) => {
            if (position !== "ALL" && position !== pos) return null;
            if (posPlayers.length === 0) return null;
            
            const isExpanded = expandedPositions[pos] !== false;
            const displayCount = getDisplayCount(pos, posPlayers.length);
            const displayedPlayers = posPlayers.slice(0, displayCount);
            const hasMore = displayCount < posPlayers.length;
            
            return (
              <Card key={pos} className="overflow-hidden">
                {/* Position Header - Collapsible */}
                <button
                  onClick={() => togglePosition(pos)}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-3 hover:from-gray-100 hover:to-gray-150 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                    <h3 className="text-base font-semibold text-gray-900">
                      {positionNames[pos as keyof typeof positionNames]}
                    </h3>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {posPlayers.length}
                    </span>
                  </div>
                  <div className="flex gap-8 text-sm font-medium text-gray-500">
                    <span>Price</span>
                    <span>TP</span>
                  </div>
                </button>
                
                {/* Player List */}
                {isExpanded && (
                  <div className="p-2">
                    <div className="space-y-1">
                      {displayedPlayers.map((player) => (
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
                            <DialogContent className="max-w-2xl">
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
                            <PlayerRow
                              player={player}
                              onAdd={handleAdd}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Show More Button */}
                    {hasMore && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() => showMore(pos, displayCount)}
                          className="gap-2"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Show {Math.min(5, posPlayers.length - displayCount)} more
                        </Button>
                      </div>
                    )}
                    
                    {/* Showing count indicator */}
                    <div className="mt-2 text-center text-xs text-gray-500">
                      Showing {displayedPlayers.length} of {posPlayers.length}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
