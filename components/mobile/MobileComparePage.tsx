"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Search, X, Plus, TrendingUp, Zap } from "lucide-react";
import { Player, Fixture } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";

interface MobileComparePageProps {
  onBack: () => void;
  weekOffset?: number;
}

export function MobileComparePage({ onBack, weekOffset = 0 }: MobileComparePageProps) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch("/api/players")
      .then(res => res.json())
      .then((data: Player[]) => {
        setAllPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allPlayers
      .filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.team.toLowerCase().includes(query) ||
        (p.teamName || p.team).toLowerCase().includes(query)
      )
      .slice(0, 10);
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

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500';
      case 'DEF': return 'bg-blue-500';
      case 'MID': return 'bg-green-500';
      case 'FWD': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getFdrColor = (diff: number) => {
    if (diff <= 2) return 'bg-green-500';
    if (diff === 3) return 'bg-slate-400';
    if (diff === 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-surface-0 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-2 rounded-full text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg font-semibold text-white">Compare Players</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add Player Section */}
        <div className="px-4 py-4 border-b border-surface-border">
          {showSearch ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-surface-1 border border-surface-border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  autoFocus
                />
                <button 
                  onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="bg-surface-1 rounded-lg border border-surface-border divide-y divide-surface-border max-h-60 overflow-y-auto">
                  {searchResults.map(player => (
                    <button
                      key={player.id}
                      onClick={() => addPlayer(player)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-2 text-left"
                    >
                      <div className={`w-8 h-8 ${getPositionColor(player.position)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {player.position}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-white">{player.name}</div>
                        <div className="text-xs text-slate-500">{player.teamName || player.team} • £{player.price.toFixed(1)}m</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              disabled={selectedPlayers.length >= 4}
              className="w-full py-3 border-2 border-dashed border-surface-border rounded-lg text-slate-400 font-medium flex items-center justify-center gap-2 hover:border-violet-500/40 hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Player to Compare ({selectedPlayers.length}/4)
            </button>
          )}
        </div>

        {/* Selected Players Comparison */}
        {selectedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-surface-1 rounded-full flex items-center justify-center mb-4 border border-surface-border">
              <TrendingUp className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="font-display font-semibold text-white mb-2">No players selected</h3>
            <p className="text-sm text-slate-400">Add up to 4 players to compare their stats, form, and fixtures</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Player Cards */}
            <div className="grid grid-cols-2 gap-3">
              {selectedPlayers.map(player => (
                <div key={player.id} className="bg-surface-1 rounded-xl border border-surface-border overflow-hidden">
                  <div className={`${getPositionColor(player.position)} px-3 py-2 flex items-center justify-between`}>
                    <span className="text-white text-xs font-bold">{player.position}</span>
                    <button 
                      onClick={() => removePlayer(player.id)}
                      className="text-white/80 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate text-white">{player.name}</div>
                    <div className="text-xs text-slate-500">{player.team}</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">£{player.price.toFixed(1)}m</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Comparison Table */}
            <div className="bg-surface-1 rounded-xl border border-surface-border overflow-hidden">
              <div className="bg-surface-2 px-4 py-2 border-b border-surface-border">
                <h3 className="font-semibold text-sm text-white">Stats Comparison</h3>
              </div>
              
              <div className="divide-y divide-surface-border">
                {/* Predicted Points */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Pred. Pts</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-bold text-cyan-400">{weeklyExp(player, weekOffset).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Form</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-semibold text-white">{player.form?.toFixed(1) || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Price</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-semibold text-white">£{player.price.toFixed(1)}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ownership */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Owned</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-semibold text-white">{player.ownership?.toFixed(1) || "-"}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected minutes */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Exp. mins</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-semibold text-white">{(player.playingTime?.expectedMinutes ?? (player.minutesProb ?? 0) * 90).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixtures Comparison */}
            <div className="bg-surface-1 rounded-xl border border-surface-border overflow-hidden">
              <div className="bg-surface-2 px-4 py-2 border-b border-surface-border">
                <h3 className="font-semibold text-sm text-white">Next 3 Fixtures</h3>
              </div>
              
              <div className="p-4">
                <div className="flex gap-2">
                  {selectedPlayers.map(player => {
                    // Group fixtures by event for DGW display
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
                      <div key={player.id} className="flex-1 space-y-2">
                        <div className="text-xs text-slate-500 truncate text-center">{player.name.split(' ').pop()}</div>
                        {groups.slice(0, 3).map((group, gIdx) => (
                          <div key={gIdx} className="space-y-0.5">
                            {group.fixtures.length >= 2 && (
                              <div className="text-center">
                                <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-violet-500/20 text-violet-300 leading-none">DGW</span>
                              </div>
                            )}
                            {group.fixtures.map((fixture, fIdx) => (
                              <div 
                                key={fIdx}
                                className={`${getFdrColor(fixture.diff)} text-white text-center py-1.5 rounded text-xs font-medium`}
                              >
                                {fixture.opp} ({fixture.H ? 'H' : 'A'})
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
      </div>
    </div>
  );
}
