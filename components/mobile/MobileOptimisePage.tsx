"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Crown, Zap, Users, TrendingUp, Trophy } from "lucide-react";
import { Player, Fixture } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { pickXIForWeek, pickBestXIFromPool, weeklyExp } from "@/lib/optimizer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Get background color based on fixture difficulty rating (FDR)
function getFDRColor(diff: number): string {
  switch (diff) {
    case 1: return "bg-emerald-500 text-white";
    case 2: return "bg-green-400 text-white";
    case 3: return "bg-amber-400 text-gray-900";
    case 4: return "bg-orange-500 text-white";
    case 5: return "bg-red-600 text-white";
    default: return "bg-gray-400 text-white";
  }
}

function MobileFixtureBadges({ fixtures, maxShow = 5 }: { fixtures: Fixture[]; maxShow?: number }) {
  const displayFixtures = fixtures.slice(0, maxShow);
  
  if (!displayFixtures.length) {
    return <span className="text-[10px] text-slate-400">No fixtures</span>;
  }

  // Group fixtures by event for DGW display
  const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
  for (const fix of displayFixtures) {
    const last = groups[groups.length - 1];
    if (last && fix.event != null && last.event === fix.event) {
      last.fixtures.push(fix);
    } else {
      groups.push({ event: fix.event, fixtures: [fix] });
    }
  }

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className={cn(
          "flex items-center gap-0.5",
          group.fixtures.length >= 2 && "ring-1 ring-blue-400 rounded px-0.5"
        )}>
          {group.fixtures.map((fix, fIdx) => (
            <div
              key={fIdx}
              className={cn(
                "rounded text-[8px] px-1 py-0.5 min-w-[24px] font-semibold text-center uppercase",
                getFDRColor(fix.diff)
              )}
            >
              {fix.opp}
              <span className="text-[6px] opacity-80 ml-0.5">{fix.H ? "H" : "A"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface MobileOptimisePageProps {
  onBack: () => void;
  weekOffset?: number;
}

export function MobileOptimisePage({ onBack, weekOffset = 0 }: MobileOptimisePageProps) {
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const [activeTab, setActiveTab] = useState<'optimised' | 'market'>('optimised');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all players from API (same as web version)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('Failed to fetch players');
        const data: Player[] = await res.json();
        if (!cancelled) setAllPlayers(data);
      } catch (e) {
        console.error('Failed to load players', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const optimizedTeam = useMemo(() => {
    return pickXIForWeek(squad, weekOffset);
  }, [squad, weekOffset]);

  // Market leaders - Team of the Week (best XI from all players)
  const teamOfTheWeek = useMemo(() => {
    if (!allPlayers.length) return null;
    return pickBestXIFromPool(allPlayers, weekOffset);
  }, [allPlayers, weekOffset]);

  // Get owned player IDs for comparison
  const squadPlayers = useMemo(() => [
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ], [squad]);
  const ownedPlayerIds = useMemo(() => new Set(squadPlayers.map(p => p.id)), [squadPlayers]);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-500';
      case 'DEF': return 'bg-blue-500';
      case 'MID': return 'bg-green-500';
      case 'FWD': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleApplyOptimal = () => {
    autoSelectBestXI(weekOffset);
    if (optimizedTeam.capId) {
      makeCaptain(optimizedTeam.capId);
    }
    toast.success("Optimal team applied!");
    onBack();
  };

  const handleApplyCaptainOnly = () => {
    if (optimizedTeam.capId) {
      makeCaptain(optimizedTeam.capId);
      toast.success("Captain updated!");
    }
  };

  const recommendedCaptain = optimizedTeam.xi.find(p => p.id === optimizedTeam.capId);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Optimise Team</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('optimised')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'optimised'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Optimised Squad
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'market'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Market Leaders
          </button>
        </div>

        {activeTab === 'optimised' ? (
          <>
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-violet-500 via-violet-600 to-cyan-600 px-4 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-white/80">Predicted Points</div>
                <div className="text-2xl font-bold">{optimizedTeam.points.toFixed(1)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80">Starting XI</div>
              <div className="text-xl font-bold">{optimizedTeam.xi.length}</div>
            </div>
          </div>
        </div>

        {/* Captain Recommendation */}
        {recommendedCaptain && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-amber-600 font-medium">Recommended Captain</div>
                  <div className="font-semibold text-amber-900">{recommendedCaptain.name}</div>
                  <div className="text-xs text-amber-700">{recommendedCaptain.team} • {recommendedCaptain.position}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-amber-700">
                  {weeklyExp(recommendedCaptain, weekOffset).toFixed(1)}
                </div>
                <div className="text-xs text-amber-600">pts</div>
              </div>
            </div>
            <button
              onClick={handleApplyCaptainOnly}
              className="w-full mt-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              Apply Captain Only
            </button>
          </div>
        )}

        {/* Starting XI */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-slate-900">Optimal Starting XI</h2>
          </div>
          
          <div className="space-y-2">
            {optimizedTeam.xi.map((player, index) => {
              const isCaptain = player.id === optimizedTeam.capId;
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${isCaptain ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4">{index + 1}</span>
                    <div className={`w-8 h-8 ${getPositionColor(player.position)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                      {player.position}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{player.name}</span>
                      {isCaptain && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">C</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {player.team} • £{player.price.toFixed(1)}m
                    </div>
                    <MobileFixtureBadges fixtures={player.nextFixtures || []} />
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-violet-600 font-semibold">
                      <Zap className="h-3.5 w-3.5" />
                      {weeklyExp(player, weekOffset).toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench */}
        <div className="px-4 mt-6 mb-4">
          <h2 className="font-semibold text-slate-900 mb-3">Bench</h2>
          <div className="space-y-2">
            {optimizedTeam.bench.map((player, index) => (
              <div 
                key={player.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4">{index + 1}</span>
                  <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {player.position}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 truncate">{player.name}</div>
                  <div className="text-xs text-slate-500">
                    {player.team} • £{player.price.toFixed(1)}m
                  </div>
                  <MobileFixtureBadges fixtures={player.nextFixtures || []} />
                </div>
                
                <div className="text-sm text-slate-500">
                  {weeklyExp(player, weekOffset).toFixed(1)} pts
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        ) : (
          /* Market Leaders Tab - Team of the Week */
          <div className="px-4 py-4">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-4 py-5 text-white rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm text-white/80">Elite XI • Highest Expected Returns</div>
                    <div className="text-xl font-bold">Team of the Week</div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <div className="text-sm text-slate-500">Analyzing players...</div>
                </div>
              </div>
            ) : teamOfTheWeek ? (
              <>
                {/* Stats Bar */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-center">
                    <div className="font-semibold text-emerald-700">£{teamOfTheWeek.xi.reduce((sum, p) => sum + p.price, 0).toFixed(1)}m</div>
                    <div className="text-[10px] text-slate-500">Total Value</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-700">{teamOfTheWeek.xi.filter(p => ownedPlayerIds.has(p.id)).length}/{teamOfTheWeek.xi.length}</div>
                    <div className="text-[10px] text-slate-500">You Own</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-violet-700">{teamOfTheWeek.points.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500">Expected Pts</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {teamOfTheWeek.xi.map((player, index) => {
                    const isOwned = ownedPlayerIds.has(player.id);
                    const isCaptain = player.id === teamOfTheWeek.capId;
                    
                    return (
                      <div 
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isOwned 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                            index < 3 ? 'bg-amber-100 text-amber-700' : 'text-slate-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div className={`w-8 h-8 ${getPositionColor(player.position)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {player.position}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">{player.name}</span>
                            {isOwned && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-semibold rounded flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> Owned
                              </span>
                            )}
                            {isCaptain && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded">C</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {player.team} • £{player.price.toFixed(1)}m
                          </div>
                          <MobileFixtureBadges fixtures={player.nextFixtures || []} />
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <Zap className="h-3.5 w-3.5" />
                            {weeklyExp(player, weekOffset).toFixed(1)}
                          </div>
                          <div className="text-[10px] text-slate-400">pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">Unable to load team data</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="border-t bg-white px-4 py-4 pb-safe">
        <button
          onClick={handleApplyOptimal}
          className="w-full py-3.5 rounded-full font-semibold text-white bg-gradient-brand-cta hover:opacity-90 flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-5 h-5" />
          Apply Optimal Team
        </button>
        <p className="text-xs text-center text-slate-500 mt-3">
          This will set your starting XI and captain to maximize predicted points
        </p>
      </div>
    </div>
  );
}
