"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Hash } from "lucide-react";
import { useSquadStore } from "@/store/squad";
import type { Squad, Player } from "@/lib/data";

interface LeagueTeam {
  entryId: number;
  teamName: string;
  managerName: string;
  rank: number;
  points: number;
}

export default function ImportPage() {
  const replaceSquad = useSquadStore((s) => s.replaceSquad);
  const syncPrices = useSquadStore((s) => s.syncPrices);
  const [pending, startTransition] = useTransition();
  const [entryId, setEntryId] = useState("");
  const [preset, setPreset] = useState<string>("baseline");
  const [message, setMessage] = useState<string>("");
  
  // League search state
  const [leagueId, setLeagueId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<LeagueTeam[]>([]);
  const [leagueName, setLeagueName] = useState<string>("");
  const [searching, setSearching] = useState(false);

  const onImport = () => {
    setMessage("");
    const id = entryId.trim();
    if (!id) { setMessage("Enter your FPL team ID"); return; }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/squad?entryId=${encodeURIComponent(id)}&preset=${encodeURIComponent(preset)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to import squad");
        replaceSquad(data as Squad);
        setMessage(`Imported squad for ID ${id}.`);
      } catch (e: any) {
        setMessage(e?.message || "Import failed");
      }
    });
  };

  const onSyncPrices = () => {
    setMessage("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/players?preset=${encodeURIComponent(preset)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load players");
        syncPrices(data as Player[]);
        setMessage("Prices synced to latest FPL.");
      } catch (e: any) {
        setMessage(e?.message || "Price sync failed");
      }
    });
  };

  const onSearchLeague = async () => {
    setMessage("");
    const id = leagueId.trim();
    if (!id) { 
      setMessage("Enter a league ID"); 
      return; 
    }
    
    setSearching(true);
    try {
      const res = await fetch(
        `/api/league-search?leagueId=${encodeURIComponent(id)}&search=${encodeURIComponent(searchTerm)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to search league");
      
      setSearchResults(data.teams || []);
      setLeagueName(data.leagueName || "");
      
      if (data.teams?.length === 0) {
        setMessage("No teams found matching your search");
      }
    } catch (e: any) {
      setMessage(e?.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onImportFromSearch = (team: LeagueTeam) => {
    setMessage("");
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/squad?entryId=${encodeURIComponent(team.entryId)}&preset=${encodeURIComponent(preset)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to import squad");
        replaceSquad(data as Squad);
        setMessage(`Imported "${team.teamName}" (${team.managerName})`);
      } catch (e: any) {
        setMessage(e?.message || "Import failed");
      }
    });
  };

  return (
    <main className="container py-6">
      <div className="mb-4 text-xl font-semibold">Import Squad</div>
      
      <Card className="max-w-3xl p-4">
        <Tabs defaultValue="id" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="id" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              By Team ID
            </TabsTrigger>
            <TabsTrigger value="name" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              By Team Name
            </TabsTrigger>
          </TabsList>

          {/* Import by Team ID */}
          <TabsContent value="id" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Enter your FPL team (entry) ID to load your current squad and bank.
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,160px]">
              <Input 
                placeholder="FPL Team ID (e.g. 1234567)" 
                value={entryId} 
                onChange={(e) => setEntryId(e.target.value)} 
                inputMode="numeric" 
              />
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger><SelectValue placeholder="Preset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onImport} disabled={pending}>
                {pending ? "Importing..." : "Import"}
              </Button>
              <Button variant="secondary" onClick={onSyncPrices} disabled={pending}>
                {pending ? "Syncing..." : "Sync Prices"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: Find your team ID in the URL on the FPL website when viewing your team 
              (e.g. fantasy.premierleague.com/entry/<strong>1234567</strong>/event/).
            </div>
          </TabsContent>

          {/* Import by Team Name */}
          <TabsContent value="name" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Search for your team in a league (like your mini-league). Enter the league ID and optionally search by team or manager name.
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,160px]">
                <Input 
                  placeholder="League ID (e.g. 314 for Overall)" 
                  value={leagueId} 
                  onChange={(e) => setLeagueId(e.target.value)} 
                  inputMode="numeric" 
                />
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger><SelectValue placeholder="Preset" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="baseline">Baseline</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Search by team or manager name (optional)" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearchLeague()}
                />
                <Button onClick={onSearchLeague} disabled={searching || !leagueId}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {leagueName && (
              <div className="text-sm font-medium text-muted-foreground">
                League: {leagueName}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="text-sm font-medium">
                  Found {searchResults.length} team{searchResults.length !== 1 ? 's' : ''}
                </div>
                {searchResults.map((team) => (
                  <div 
                    key={team.entryId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{team.teamName}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.managerName} • Rank: {team.rank} • {team.points} pts
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => onImportFromSearch(team)}
                      disabled={pending}
                    >
                      {pending ? "Importing..." : "Import"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Tip: Find league IDs in the URL when viewing a league on the FPL website 
              (e.g. fantasy.premierleague.com/leagues/<strong>12345</strong>/standings/). 
              Use 314 to search the Overall League (all players).
            </div>
          </TabsContent>
        </Tabs>

        {message && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm">{message}</div>
        )}
      </Card>
    </main>
  );
}
