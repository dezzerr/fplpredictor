"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Search, X, Plus, TrendingUp, Zap } from "lucide-react";
import { Player, Fixture } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";

interface MobileComparePageProps {
  onBack: () => void;
  weekOffset?: number;
}

const TEAM_NAMES: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton", BUR: "Burnley", CHE: "Chelsea", CRY: "Crystal Palace",
  EVE: "Everton", FUL: "Fulham", LEE: "Leeds", LIV: "Liverpool",
  MCI: "Man City", MUN: "Man Utd", NEW: "Newcastle", NFO: "Nott'm Forest",
  SUN: "Sunderland", TOT: "Spurs", WHU: "West Ham", WOL: "Wolves"
};

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
        TEAM_NAMES[p.team]?.toLowerCase().includes(query)
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
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Compare Players</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add Player Section */}
        <div className="px-4 py-4 border-b">
          {showSearch ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 max-h-60 overflow-y-auto">
                  {searchResults.map(player => (
                    <button
                      key={player.id}
                      onClick={() => addPlayer(player)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 text-left"
                    >
                      <div className={`w-8 h-8 ${getPositionColor(player.position)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {player.position}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-slate-500">{TEAM_NAMES[player.team] || player.team} • £{player.price.toFixed(1)}m</div>
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
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-medium flex items-center justify-center gap-2 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Player to Compare ({selectedPlayers.length}/4)
            </button>
          )}
        </div>

        {/* Selected Players Comparison */}
        {selectedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">No players selected</h3>
            <p className="text-sm text-slate-500">Add up to 4 players to compare their stats, form, and fixtures</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Player Cards */}
            <div className="grid grid-cols-2 gap-3">
              {selectedPlayers.map(player => (
                <div key={player.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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
                    <div className="font-semibold text-sm truncate">{player.name}</div>
                    <div className="text-xs text-slate-500">{player.team}</div>
                    <div className="text-lg font-bold text-purple-600 mt-1">£{player.price.toFixed(1)}m</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Comparison Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b">
                <h3 className="font-semibold text-sm">Stats Comparison</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {/* Predicted Points */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Pred. Pts</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-bold text-purple-600">{weeklyExp(player, weekOffset).toFixed(1)}</span>
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
                        <span className="font-semibold">{player.form?.toFixed(1) || "-"}</span>
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
                        <span className="font-semibold">£{player.price.toFixed(1)}m</span>
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
                        <span className="font-semibold">{player.ownership?.toFixed(1) || "-"}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Minutes Prob */}
                <div className="flex items-center px-4 py-3">
                  <div className="w-24 text-xs text-slate-500">Mins %</div>
                  <div className="flex-1 flex gap-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex-1 text-center">
                        <span className="font-semibold">{player.minutesProb ? (player.minutesProb * 100).toFixed(0) : "-"}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixtures Comparison */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b">
                <h3 className="font-semibold text-sm">Next 3 Fixtures</h3>
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
                                <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-blue-500 text-white leading-none">DGW</span>
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
