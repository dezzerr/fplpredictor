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
import { PiggyBank, Pencil, Sparkles, Gauge, Trophy, UploadCloud, Search, Calendar, Target, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

export function HeaderKpis({ compact = false, onGwChange, weekPredPts }: { compact?: boolean; onGwChange?: (offset: number) => void; weekPredPts?: number } = {}) {
  const [mounted, setMounted] = useState(false);
  const [deadline, setDeadline] = useState<Date>(getMockDeadline());
  const [eventName, setEventName] = useState<string>("Gameweek");
  const [currentGw, setCurrentGw] = useState<number>(8); // Will be fetched from API
  const [gwOffset, setGwOffset] = useState<number>(0);
  
  useEffect(() => { 
    setMounted(true);
    // Fetch real deadline from our API endpoint (avoids CORS)
    fetch('/api/deadline')
      .then(res => res.json())
      .then(data => {
        setDeadline(new Date(data.deadline));
        setEventName(data.eventName);
        // Extract GW number from event name (e.g., "Gameweek 8" -> 8)
        const match = data.eventName.match(/\d+/);
        if (match) setCurrentGw(parseInt(match[0]));
      })
      .catch(err => {
        console.error('Failed to fetch deadline:', err);
        // Keep using mock deadline on error
      });
  }, []);
  
  const deadlineText = mounted ? formatDeadline(deadline, "").replace(eventName, "").trim() : "";
  const countdown = useCountdown(deadline);

  const teamRating = useSquadStore((s) => s.teamRating());
  const gwRating = useSquadStore((s) => s.gwRating());
  const bank = useSquadStore((s) => s.squad.bank);
  const setBank = useSquadStore((s) => s.setBank);
  const replaceSquad = useSquadStore((s) => s.replaceSquad);
  const syncPrices = useSquadStore((s) => s.syncPrices);
  
  const handleGwChange = (delta: number) => {
    const newOffset = Math.max(0, Math.min(9, gwOffset + delta));
    setGwOffset(newOffset);
    onGwChange?.(newOffset);
  };
  
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
      {/* Top Bar with Logo and Actions */}
      <div className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground hover:text-primary transition-colors">
            FPL Companion
          </Link>
          <nav className="flex items-center gap-2">
            <Link 
              href="/compare" 
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="hidden sm:inline">Compare</span>
              <Target className="h-4 w-4 sm:hidden" />
            </Link>
            <Link 
              href="/fixtures" 
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="hidden sm:inline">Fixtures</span>
              <CalendarDays className="h-4 w-4 sm:hidden" />
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
      </div>

      {/* Gameweek Stats Bar */}
      {!compact && (
        <div className="sticky top-[57px] z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container py-3">
            <div className="flex items-center justify-between gap-6">
              {/* Gameweek Title with Navigation - Left Side */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleGwChange(-1)}
                  disabled={gwOffset === 0}
                  className="h-7 w-7"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold leading-tight" suppressHydrationWarning>
                    {mounted ? `Gameweek ${currentGw + gwOffset}` : "Gameweek"}
                  </h2>
                  <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {mounted ? deadlineText : ""}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleGwChange(1)}
                  className="h-7 w-7"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Stats Grid - Right Side */}
              <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Team Rating</div>
              <div className="text-xl font-bold text-emerald-600" suppressHydrationWarning>
                {mounted ? <AnimatedNumber value={teamRating} format={(n) => `${Math.round(n)}%`} /> : "0%"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Predicted Points</div>
              <div className="text-xl font-bold" suppressHydrationWarning>
                {mounted && typeof weekPredPts === 'number' ? <AnimatedNumber value={weekPredPts} format={(n) => n.toFixed(1)} /> : "0.0"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">GW Rating</div>
              <div className="text-xl font-bold text-sky-600" suppressHydrationWarning>
                {mounted ? <AnimatedNumber value={gwRating} format={(n) => `${Math.round(n)}%`} /> : "0%"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">In the bank</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-xl font-bold" suppressHydrationWarning>
                  {mounted ? `£${bank.toFixed(1)}m` : "£0.0m"}
                </span>
                <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if (o) setBankInput(bank.toFixed(1)); }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
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
            </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
