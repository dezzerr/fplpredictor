"use client";

import { useMemo } from "react";
import { ArrowLeft, Crown, Zap, Users, TrendingUp } from "lucide-react";
import { useSquadStore } from "@/store/squad";
import { pickXIForWeek, weeklyExp } from "@/lib/optimizer";
import { toast } from "sonner";

interface MobileOptimisePageProps {
  onBack: () => void;
  weekOffset?: number;
}

export function MobileOptimisePage({ onBack, weekOffset = 0 }: MobileOptimisePageProps) {
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);

  const optimizedTeam = useMemo(() => {
    return pickXIForWeek(squad, weekOffset);
  }, [squad, weekOffset]);

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
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 px-4 py-5 text-white">
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
                </div>
                
                <div className="text-sm text-slate-500">
                  {weeklyExp(player, weekOffset).toFixed(1)} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="border-t bg-white px-4 py-4 pb-safe">
        <button
          onClick={handleApplyOptimal}
          className="w-full py-3.5 rounded-full font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 flex items-center justify-center gap-2"
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
