"use client";

import { useState, useTransition } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { LiveGwProvider } from "@/components/LiveGwProvider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSquadStore } from "@/store/squad";
import type { Squad, Player } from "@/lib/data";

export default function ImportPage() {
  const replaceSquad = useSquadStore((s) => s.replaceSquad);
  const syncPrices = useSquadStore((s) => s.syncPrices);
  const [pending, startTransition] = useTransition();
  const [entryId, setEntryId] = useState("");
  const [preset, setPreset] = useState<string>("baseline");
  const [message, setMessage] = useState<string>("");

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

  return (
    <LiveGwProvider>
    <div className="min-h-dvh bg-slate-50">
      <AppNavbar />
      <GwInfoBar />
    <main className="container py-6">
      <div className="mb-4 text-xl font-semibold">Import Squad</div>
      <Card className="max-w-xl p-4">
        <div className="mb-3 text-sm text-muted-foreground">
          Enter your FPL team (entry) ID to load your current squad and bank. We&apos;ll use the latest prices and projections.
        </div>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,160px]">
          <Input placeholder="FPL Team ID (e.g. 1234567)" value={entryId} onChange={(e) => setEntryId(e.target.value)} inputMode="numeric" />
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
        {message && (
          <div className="mt-3 text-sm text-muted-foreground">{message}</div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Tip: Find your team ID in the URL on the FPL website when viewing your team points (e.g. fantasy.premierleague.com/entry/<strong>1234567</strong>/event/).
        </div>
      </Card>
    </main>
    </div>
    </LiveGwProvider>
  );
}
