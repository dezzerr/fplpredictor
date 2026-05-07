"use client";

import { useMemo } from "react";
import type { Player, Position } from "@/lib/data";
import { PlayerTile } from "@/components/PlayerTile";
import { weeklyExp } from "@/lib/optimizer";
import { Crown } from "lucide-react";

interface OptimalPitchViewProps {
  xi: Player[];
  bench?: Player[];
  captainId?: string;
  viceId?: string;
  weekOffset?: number;
  onPlayerClick?: (player: Player) => void;
  ownedIds?: Set<string>;
  highlightOwned?: boolean;
}

function groupByPosition(players: Player[]): Record<Position, Player[]> {
  const groups: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) groups[p.position].push(p);
  return groups;
}

function Row({
  players,
  captainId,
  viceId,
  weekOffset,
  onPlayerClick,
  ownedIds,
  highlightOwned,
}: {
  players: Player[];
  captainId?: string;
  viceId?: string;
  weekOffset?: number;
  onPlayerClick?: (player: Player) => void;
  ownedIds?: Set<string>;
  highlightOwned?: boolean;
}) {
  if (!players.length) return null;
  return (
    <div className="flex items-start justify-center gap-2 sm:gap-4">
      {players.map((player) => {
        const owned = highlightOwned && ownedIds?.has(player.id);
        return (
          <div key={player.id} className="w-[72px] sm:w-[100px] relative">
            {owned && (
              <div className="absolute -top-1 -left-1 z-20 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded shadow">
                OWNED
              </div>
            )}
            <PlayerTile
              player={player}
              isCaptain={captainId === player.id}
              isVice={viceId === player.id}
              weekOffset={weekOffset}
              onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

export function OptimalPitchView({
  xi,
  bench = [],
  captainId,
  viceId,
  weekOffset = 0,
  onPlayerClick,
  ownedIds,
  highlightOwned,
}: OptimalPitchViewProps) {
  const grouped = useMemo(() => groupByPosition(xi), [xi]);

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-800/40">
      {/* Pitch */}
      <div className="mobile-pitch-bg relative overflow-hidden">
        <div className="space-y-3 sm:space-y-5 px-2 py-5 sm:py-7 relative z-10">
          <Row
            players={grouped.GK}
            captainId={captainId}
            viceId={viceId}
            weekOffset={weekOffset}
            onPlayerClick={onPlayerClick}
            ownedIds={ownedIds}
            highlightOwned={highlightOwned}
          />
          <Row
            players={grouped.DEF}
            captainId={captainId}
            viceId={viceId}
            weekOffset={weekOffset}
            onPlayerClick={onPlayerClick}
            ownedIds={ownedIds}
            highlightOwned={highlightOwned}
          />
          <Row
            players={grouped.MID}
            captainId={captainId}
            viceId={viceId}
            weekOffset={weekOffset}
            onPlayerClick={onPlayerClick}
            ownedIds={ownedIds}
            highlightOwned={highlightOwned}
          />
          <Row
            players={grouped.FWD}
            captainId={captainId}
            viceId={viceId}
            weekOffset={weekOffset}
            onPlayerClick={onPlayerClick}
            ownedIds={ownedIds}
            highlightOwned={highlightOwned}
          />
        </div>
        {/* Field markings */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-14 border-2 border-white/15 rounded-t-full border-b-0" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/15 rounded-full" />
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="bg-slate-900 px-3 py-4 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 text-center">
            Bench
          </div>
          <div className="flex items-start justify-center gap-2 sm:gap-3">
            {bench.map((player) => {
              const owned = highlightOwned && ownedIds?.has(player.id);
              return (
                <div key={player.id} className="w-[64px] sm:w-[88px] relative">
                  {owned && (
                    <div className="absolute -top-1 -left-1 z-20 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded shadow">
                      OWNED
                    </div>
                  )}
                  <PlayerTile
                    player={player}
                    weekOffset={weekOffset}
                    onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
