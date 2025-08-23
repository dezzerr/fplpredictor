"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/data";
import { useFilters, MIN_PRICE, MAX_PRICE } from "@/store/filters";
import { useSquadStore } from "@/store/squad";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerRow } from "@/components/PlayerRow";
import { toast } from "sonner";

export function PlayerFinder() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      // EXP_POINTS default
      list = list.slice().sort((a, b) => (b.expPoints ?? 0) - (a.expPoints ?? 0));
    }

    return list;
  }, [players, search, price, auto, inSquad, position, sort]);

  const handleAdd = (p: Player) => {
    const res = addPlayer(p);
    if (!res.ok) toast.error(res.reason);
    else toast.success(`Added ${p.name}`);
  };

  return (
    <Card className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-semibold">Players</div>
        <label className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span>Auto-filter</span>
          <Switch checked={auto} onCheckedChange={setAuto} aria-label="Auto filter out owned" />
        </label>
      </div>

      {/* Position tabs + Sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Position</div>
          <Tabs value={position} onValueChange={(v)=> setPosition(v as any)}>
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="GK">GK</TabsTrigger>
              <TabsTrigger value="DEF">DEF</TabsTrigger>
              <TabsTrigger value="MID">MID</TabsTrigger>
              <TabsTrigger value="FWD">FWD</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-56">
          <div className="text-xs text-muted-foreground">Sort By</div>
          <Select value={sort} onValueChange={(v)=> setSort(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRICE">Price</SelectItem>
              <SelectItem value="EXP_POINTS">Expected Points</SelectItem>
              <SelectItem value="FIXTURE_EASE">Fixture Ease</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name or team" aria-label="Search players" />
      <div className="px-1 text-xs text-muted-foreground">
        Price: £{price[0].toFixed(1)}m – £{price[1].toFixed(1)}m
      </div>
      <Slider value={[price[0], price[1]]} onValueChange={(v)=> setPrice([v[0] ?? MIN_PRICE, v[1] ?? MAX_PRICE])} min={MIN_PRICE} max={MAX_PRICE} step={0.5} />

      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-2 py-1">
          {loading && players.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">Loading players...</div>
          ) : error && players.length === 0 ? (
            <div className="p-2 text-xs text-rose-600">Failed to load players: {error}</div>
          ) : (
            filtered.map(p => (
              <PlayerRow key={p.id} player={p} onAdd={handleAdd} />
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

