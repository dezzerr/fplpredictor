"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import { PlayerFinder } from "@/components/PlayerFinder";

export default function PlayersPage() {
  return (
    <div className="min-h-dvh">
      <HeaderKpis />
      <main className="container py-4">
        <div className="mb-3 text-lg font-semibold">Players</div>
        <PlayerFinder />
      </main>
    </div>
  );
}
