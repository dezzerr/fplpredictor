"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDeadline, getMockDeadline } from "@/lib/date";
import { useCountdown } from "@/lib/use-countdown";
import { useSquadStore } from "@/store/squad";
import { PiggyBank, Pencil, Sparkles, Gauge, Trophy, UploadCloud, Search, Calendar } from "lucide-react";
import Link from "next/link";
import type { Squad, Player } from "@/lib/data";
import { toast } from "sonner";

function Kpi({ label, value, icon, className }: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex items-center gap-3 px-4 py-2", className)}>
      {icon}
      <div className="leading-tight">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </Card>
  );
}

export function HeaderKpis({ compact = false }: { compact?: boolean } = {}) {
  const [mounted, setMounted] = useState(false);
  const [deadline, setDeadline] = useState<Date>(getMockDeadline());
  const [eventName, setEventName] = useState<string>("Gameweek");
  
  useEffect(() => { 
    setMounted(true);
    // Fetch real deadline from our API endpoint (avoids CORS)
    fetch('/api/deadline')
      .then(res => res.json())
      .then(data => {
        setDeadline(new Date(data.deadline));
        setEventName(data.eventName);
      })
      .catch(err => {
        console.error('Failed to fetch deadline:', err);
        // Keep using mock deadline on error
      });
  }, []);
  
  const deadlineText = mounted ? formatDeadline(deadline, eventName) : "";
  const countdown = useCountdown(deadline);

  const teamRating = useSquadStore((s) => s.teamRating());
  const gwRating = useSquadStore((s) => s.gwRating());
  const totalExp = useSquadStore((s) => s.totalExpPoints());
  const bank = useSquadStore((s) => s.squad.bank);
  const setBank = useSquadStore((s) => s.setBank);
  const replaceSquad = useSquadStore((s) => s.replaceSquad);
  const syncPrices = useSquadStore((s) => s.syncPrices);
  
  const [open, setOpen] = useState(false);
  const [bankInput, setBankInput] = useState(bank.toFixed(1));
  
  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [entryId, setEntryId] = useState("");
  const [preset, setPreset] = useState<string>("baseline");
  const [importMessage, setImportMessage] = useState<string>("");

  const onImport = () => {
    setImportMessage("");
    const id = entryId.trim();
    if (!id) { 
      toast.error("Enter your FPL team ID");
      return; 
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/squad?entryId=${encodeURIComponent(id)}&preset=${encodeURIComponent(preset)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to import squad");
        replaceSquad(data as Squad);
        setImportMessage(`Successfully imported squad for ID ${id}!`);
        toast.success(`Imported team ${id}`);
        setTimeout(() => setImportOpen(false), 1500);
      } catch (e: any) {
        const msg = e?.message || "Import failed";
        setImportMessage(msg);
        toast.error(msg);
      }
    });
  };

  const onSyncPrices = () => {
    setImportMessage("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/players?preset=${encodeURIComponent(preset)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load players");
        syncPrices(data as Player[]);
        setImportMessage("Prices synced to latest FPL!");
        toast.success("Prices synced");
      } catch (e: any) {
        const msg = e?.message || "Price sync failed";
        setImportMessage(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            FPL Copilot
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span suppressHydrationWarning>{deadlineText}</span>
            <span className="rounded-full bg-muted px-2 py-0.5" suppressHydrationWarning>
              {countdown}
            </span>
          </div>
        </div>
        
        {!compact && (
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-2xl mx-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
              <Kpi 
                label="Team" 
                value={<span suppressHydrationWarning><AnimatedNumber value={mounted ? teamRating : 0} format={(n) => `${Math.round(n)}%`} /></span>} 
                icon={<Gauge className="h-4 w-4 text-emerald-600" />} 
                className="text-xs"
              />
              <Kpi 
                label="Points" 
                value={<span suppressHydrationWarning><AnimatedNumber value={mounted ? totalExp : 0} /></span>} 
                icon={<Trophy className="h-4 w-4 text-amber-600" />}
                className="text-xs" 
              />
              <div className="hidden lg:block">
                <Kpi 
                  label="GW" 
                  value={<span suppressHydrationWarning><AnimatedNumber value={mounted ? gwRating : 0} format={(n) => `${Math.round(n)}%`} /></span>} 
                  icon={<Sparkles className="h-4 w-4 text-sky-600" />}
                  className="text-xs"
                />
              </div>
              <div className="relative">
                <Kpi 
                  label="Bank" 
                  value={
                    <div className="flex items-center gap-1">
                      <span suppressHydrationWarning>£<AnimatedNumber value={mounted ? bank : 0} /></span>
                      <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if (o) setBankInput(bank.toFixed(1)); }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Bank</DialogTitle>
                            <DialogDescription>Adjust available funds in your bank.</DialogDescription>
                          </DialogHeader>
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5" />
                            <Input value={bankInput} onChange={(e)=>setBankInput(e.target.value)} inputMode="decimal" />
                            <Button onClick={()=>{ const v = parseFloat(bankInput); if (!Number.isNaN(v)) { setBank(Number(v.toFixed(1))); setOpen(false); } }}>
                              Save
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  } 
                  className="text-xs !px-2"
                />
              </div>
            </div>
          </div>
        )}
        
        <nav className="flex items-center gap-2">
          <Link 
            href="/players" 
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span className="hidden sm:inline">Players</span>
            <Search className="h-4 w-4 sm:hidden" />
          </Link>
          <Link 
            href="/optimize" 
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span className="hidden sm:inline">Optimize</span>
            <Calendar className="h-4 w-4 sm:hidden" />
          </Link>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <UploadCloud className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import FPL Squad</DialogTitle>
                <DialogDescription>
                  Enter your FPL team ID to load your current squad with latest prices and projections.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="FPL Team ID (e.g. 1234567)" 
                    value={entryId} 
                    onChange={(e) => setEntryId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onImport()}
                    inputMode="numeric"
                    disabled={pending}
                  />
                  <Select value={preset} onValueChange={setPreset} disabled={pending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="baseline">Baseline</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onImport} disabled={pending} className="flex-1">
                    {pending ? "Importing..." : "Import Squad"}
                  </Button>
                  <Button variant="secondary" onClick={onSyncPrices} disabled={pending}>
                    {pending ? "Syncing..." : "Sync Prices"}
                  </Button>
                </div>
                {importMessage && (
                  <div className={cn(
                    "text-sm p-3 rounded-md",
                    importMessage.includes("Success") || importMessage.includes("synced")
                      ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                      : "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
                  )}>
                    {importMessage}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Find your team ID in the URL when viewing your team on FPL (e.g. fantasy.premierleague.com/entry/<strong>1234567</strong>/event/).
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </nav>
      </div>
    </header>
  );
}
