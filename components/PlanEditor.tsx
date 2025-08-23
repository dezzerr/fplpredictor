"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlansStore, type Chip } from "@/store/plans";
import { useSquadStore } from "@/store/squad";
import type { Player } from "@/lib/data";

export default function PlanEditor() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch players (baseline preset by default)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/players`);
        if (!res.ok) throw new Error("Failed to fetch players");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e: any) {
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

  // Stores
  const getWeek = usePlansStore((s) => s.getWeek);
  const setWeekMeta = usePlansStore((s) => s.setWeekMeta);
  const addTransfer = usePlansStore((s) => s.addTransfer);
  const removeTransfer = usePlansStore((s) => s.removeTransfer);
  const clearWeek = usePlansStore((s) => s.clearWeek);
  const serialize = usePlansStore((s) => s.serialize);
  const load = usePlansStore((s) => s.load);

  const squad = useSquadStore((s) => s.squad);

  // Local week selector
  const [week, setWeek] = useState<number>(0);

  // Editable inputs for new transfer
  const [outQuery, setOutQuery] = useState("");
  const [inQuery, setInQuery] = useState("");
  const [selectedOutId, setSelectedOutId] = useState<string>("");
  const [selectedInId, setSelectedInId] = useState<string>("");

  const weekData = getWeek(week);

  const squadPlayers = useMemo(() => ([
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ]), [squad]);

  const byId = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of squadPlayers) m.set(p.id, p);
    for (const p of players) if (!m.has(p.id)) m.set(p.id, p);
    return m;
  }, [squadPlayers, players]);

  const filteredOut = useMemo(() => {
    const q = outQuery.trim().toLowerCase();
    const arr = q ? squadPlayers.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)) : squadPlayers;
    return arr.slice(0, 20);
  }, [outQuery, squadPlayers]);

  const filteredIn = useMemo(() => {
    const owned = new Set(squadPlayers.map(p=>p.id));
    const q = inQuery.trim().toLowerCase();
    let arr = players.filter(p => !owned.has(p.id));
    if (q) arr = arr.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    return arr.slice(0, 30);
  }, [inQuery, players, squadPlayers]);

  const onAddTransfer = () => {
    const outId = selectedOutId || filteredOut[0]?.id;
    const inId = selectedInId || filteredIn[0]?.id;
    if (!outId || !inId) return;
    addTransfer(week, { outId, inId });
    // reset inputs lightly
    setSelectedOutId("");
    setSelectedInId("");
    setOutQuery("");
    setInQuery("");
  };

  const onImport = async () => {
    const text = prompt("Paste plan JSON");
    if (!text) return;
    // lightweight validation
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || !parsed || typeof parsed.weeks !== "object") throw new Error("Invalid format: missing weeks");
      for (const k of Object.keys(parsed.weeks)) {
        const w = parsed.weeks[k];
        if (typeof w.weekOffset !== "number") throw new Error("Invalid weekOffset");
        if (w.transfers && !Array.isArray(w.transfers)) throw new Error("Invalid transfers array");
        if (w.chip && !["FH","BB","TC","WC"].includes(w.chip)) throw new Error("Invalid chip value");
        if (w.bank != null && typeof w.bank !== "number") throw new Error("Invalid bank value");
      }
      const res = load(text);
      if (!res.ok) alert(res.reason || "Failed to load");
    } catch (e: any) {
      alert(e?.message || "Invalid JSON");
    }
  };

  const onExport = () => {
    const json = serialize();
    navigator.clipboard?.writeText(json).then(() => {
      alert("Plan copied to clipboard");
    }).catch(() => {
      // fallback
      prompt("Copy your plan JSON", json);
    });
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold">My Plan Editor</div>
          <div className="text-xs text-muted-foreground">Edit transfers, chips, and bank per GW. Plans persist locally.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onImport}>Import</Button>
          <Button variant="outline" size="sm" onClick={onExport}>Export</Button>
        </div>
      </div>

      {/* Week selector */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Gameweek</div>
          <Select value={String(week)} onValueChange={(v)=> setWeek(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }).map((_,i)=> (
                <SelectItem key={i} value={String(i)}>GW+{i+1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Chip</div>
          <Select
            value={weekData.chip ?? "NONE"}
            onValueChange={(v)=> setWeekMeta(week, { chip: (v === "NONE" ? undefined : (v as Chip)) })}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="FH">Free Hit</SelectItem>
              <SelectItem value="BB">Bench Boost</SelectItem>
              <SelectItem value="TC">Triple Captain</SelectItem>
              <SelectItem value="WC">Wildcard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bank override */}
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">Bank override (optional)</div>
        <div className="flex items-center gap-2">
          <Input
            value={weekData.bank == null ? "" : String(weekData.bank)}
            onChange={(e)=> {
              const v = e.target.value.trim();
              if (v === "") setWeekMeta(week, { bank: undefined });
              else {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) setWeekMeta(week, { bank: Number(n.toFixed(1)) });
              }
            }}
            inputMode="decimal"
            placeholder="e.g. 1.5"
          />
          <Button variant="outline" onClick={()=> setWeekMeta(week, { bank: undefined })}>Clear</Button>
        </div>
      </div>

      {/* Add transfer */}
      <Card className="mb-3 p-2">
        <div className="mb-2 text-sm font-medium">Add Transfer</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">Out (search owned)</div>
            <Input value={outQuery} onChange={(e)=>{ setOutQuery(e.target.value); setSelectedOutId(""); }} placeholder="Name or team" />
            <ScrollArea className="mt-2 h-28 rounded border">
              <div className="divide-y">
                {filteredOut.map(p => (
                  <button key={p.id} className={`flex w-full items-center justify-between px-2 py-1 text-left text-xs ${selectedOutId===p.id?"bg-muted":""}`} onClick={()=> setSelectedOutId(p.id)}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.team} • {p.position} • £{p.price.toFixed(1)}</span>
                  </button>
                ))}
                {filteredOut.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No matches</div>
                )}
              </div>
            </ScrollArea>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">In (search market)</div>
            <Input value={inQuery} onChange={(e)=>{ setInQuery(e.target.value); setSelectedInId(""); }} placeholder="Name or team" />
            <ScrollArea className="mt-2 h-28 rounded border">
              <div className="divide-y">
                {loading && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div>
                )}
                {!loading && filteredIn.map(p => (
                  <button key={p.id} className={`flex w-full items-center justify-between px-2 py-1 text-left text-xs ${selectedInId===p.id?"bg-muted":""}`} onClick={()=> setSelectedInId(p.id)}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.team} • {p.position} • £{p.price.toFixed(1)}</span>
                  </button>
                ))}
                {!loading && filteredIn.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No matches</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={onAddTransfer} disabled={loading || (!selectedOutId && !filteredOut.length) || (!selectedInId && !filteredIn.length)}>Add</Button>
        </div>
      </Card>

      {/* Current transfers for week */}
      <div className="mb-2 text-sm font-medium">Planned Transfers (GW+{week + 1})</div>
      <div className="space-y-2">
        {weekData.transfers.length === 0 ? (
          <div className="rounded border p-2 text-xs text-muted-foreground">No transfers added yet.</div>
        ) : (
          weekData.transfers.map((t, i) => {
            const outP = t.outId ? byId.get(t.outId) : undefined;
            const inP = t.inId ? byId.get(t.inId) : undefined;
            return (
              <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
                <div>
                  <div>Out: <span className="font-medium">{outP?.name ?? t.outId ?? "?"}</span> {outP ? `(${outP.team} • ${outP.position}) £${outP.price.toFixed(1)}m` : ""}</div>
                  <div>→ In: <span className="font-medium">{inP?.name ?? t.inId ?? "?"}</span> {inP ? `(${inP.team} • ${inP.position}) £${inP.price.toFixed(1)}m` : ""}</div>
                </div>
                <div>
                  <Button size="sm" variant="outline" onClick={()=> removeTransfer(week, i)}>Remove</Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="outline" onClick={()=> clearWeek(week)}>Clear GW</Button>
      </div>
    </Card>
  );
}
