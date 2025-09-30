"use client";

import { PlayerFinder } from "@/components/PlayerFinder";

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Player Selection</h1>
          <p className="text-gray-600">Select a maximum of 3 players from a single team or 'Auto Pick' if you're short of time.</p>
        </div>
        
        <PlayerFinder />
      </div>
    </div>
  );
}
