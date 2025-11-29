"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDeadline, getMockDeadline } from "@/lib/date";
import { useCountdown } from "@/lib/use-countdown";
import { useSquadStore } from "@/store/squad";
import { PiggyBank, Pencil, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  const [currentGw, setCurrentGw] = useState<number>(8); // Will be replaced with API eventId
  const [gwOffset, setGwOffset] = useState<number>(0);
  
  useEffect(() => { 
    setMounted(true);
    // Fetch real deadline from our API endpoint (avoids CORS)
    fetch('/api/deadline')
      .then(res => res.json())
      .then(data => {
        setDeadline(new Date(data.deadline));

        if (typeof data.eventName === "string") {
          setEventName(data.eventName);
        }

        // Prefer explicit eventId from the API for the current gameweek
        if (typeof data.eventId === "number") {
          setCurrentGw(data.eventId);
        } else {
          const parsedId = parseInt(String(data.eventId), 10);
          if (!Number.isNaN(parsedId)) {
            setCurrentGw(parsedId);
          } else if (typeof data.eventName === "string") {
            const match = data.eventName.match(/\d+/);
            if (match) setCurrentGw(parseInt(match[0], 10));
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch deadline:', err);
        // Keep using mock deadline on error
      });
  }, []);
  
  const deadlineText = mounted ? formatDeadline(deadline, "").replace(eventName, "").trim() : "";
  const countdown = useCountdown(deadline);

  // Use week-aware ratings that update when gwOffset changes
  const teamRating = useSquadStore((s) => s.teamRatingForWeek(gwOffset));
  const gwRating = useSquadStore((s) => s.gwRatingForWeek(gwOffset));
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
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const players = await res.json();
        syncPrices(players);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white backdrop-blur shadow-sm">
      {/* Top Bar with Logo and Actions */}
      <div className="border-b border-slate-800/80 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/40 via-slate-950 to-slate-950">
        <div className="container flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4">
          <Link href="/" className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
            FPL Companion
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              size="sm"
              variant="outline"
              className="gap-1 sm:gap-2 border-slate-600 text-slate-100 bg-slate-900/40 hover:bg-slate-800 h-8 sm:h-9 px-2 sm:px-3"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", refreshing && "animate-spin")} />
            </Button>
            <Button 
            size="sm"
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            onClick={async () => {
              try {
                const supabase = createClient()
                const { error } = await supabase.auth.signOut()
                
                if (error) {
                  console.error('Logout error:', error)
                  alert('Failed to log out: ' + error.message)
                } else {
                  // Redirect to home page after successful logout
                  window.location.href = '/'
                }
              } catch (error) {
                console.error('Logout error:', error)
                if (error instanceof Error) {
                  alert('Failed to log out: ' + error.message)
                } else {
                  alert('Failed to log out. Please check your Supabase configuration.')
                }
              }
            }}
          >
            <span>Log Out</span>
          </Button>
          </div>
        </div>
      </div>

      {/* Gameweek Stats Bar */}
      {!compact && (
        <div className="sticky top-[49px] sm:top-[57px] z-40 border-b border-slate-200 bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur">
          <div className="container py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-center justify-between gap-2 sm:gap-6">
              {/* Gameweek Title with Navigation - Left Side */}
              <div className="flex items-center gap-1 sm:gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleGwChange(-1)}
                  disabled={gwOffset === 0}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold leading-tight" suppressHydrationWarning>
                    {mounted ? `Gameweek ${currentGw + gwOffset}` : "Gameweek"}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground" suppressHydrationWarning>
                    {mounted ? deadlineText : ""}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleGwChange(1)}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>

              {/* Stats Grid - Mobile (all KPIs) */}
              <div className="flex lg:hidden items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-[8px] text-muted-foreground">Team</div>
                  <div className="text-xs font-bold text-emerald-600" suppressHydrationWarning>
                    {mounted ? `${Math.round(teamRating)}%` : "0%"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-muted-foreground">GW</div>
                  <div className="text-xs font-bold text-sky-600" suppressHydrationWarning>
                    {mounted ? `${Math.round(gwRating)}%` : "0%"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-muted-foreground">Pts</div>
                  <div className="text-xs font-bold" suppressHydrationWarning>
                    {mounted && typeof weekPredPts === 'number' ? weekPredPts.toFixed(1) : "0"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-muted-foreground">Bank</div>
                  <div className="text-xs font-bold" suppressHydrationWarning>
                    {mounted ? `£${bank.toFixed(1)}` : "£0"}
                  </div>
                </div>
              </div>

              {/* Stats Grid - Desktop (full) */}
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
