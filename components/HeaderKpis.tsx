"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDeadline, getMockDeadline } from "@/lib/date";
import { useCountdown } from "@/lib/use-countdown";
import { useSquadStore } from "@/store/squad";
import { PiggyBank, Pencil, Sparkles, Gauge, Trophy, UploadCloud } from "lucide-react";
import Link from "next/link";

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
  const deadline = getMockDeadline();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const deadlineText = mounted ? formatDeadline(deadline) : "";
  const countdown = useCountdown(deadline);

  const teamRating = useSquadStore((s) => s.teamRating());
  const gwRating = useSquadStore((s) => s.gwRating());
  const totalExp = useSquadStore((s) => s.totalExpPoints());
  const bank = useSquadStore((s) => s.squad.bank);
  const setBank = useSquadStore((s) => s.setBank);
  const [open, setOpen] = useState(false);
  const [bankInput, setBankInput] = useState(bank.toFixed(1));

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">FPL Copilot</div>
          <span className="hidden text-sm text-muted-foreground md:inline" aria-label="deadline" suppressHydrationWarning>
            {deadlineText}
          </span>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground md:inline" aria-label="time remaining" suppressHydrationWarning>
            {countdown}
          </span>
        </div>
        {!compact && (
          <div className="grid flex-1 grid-cols-2 gap-3 md:max-w-xl md:grid-cols-4">
            <Kpi label="Team Rating" value={<AnimatedNumber value={teamRating} format={(n) => `${Math.round(n)}%`} />} icon={<Gauge className="h-5 w-5 text-emerald-600" />} />
            <Kpi label="Predicted Pts" value={<AnimatedNumber value={totalExp} />} icon={<Trophy className="h-5 w-5 text-amber-600" />} />
            <Kpi label="GW Rating" value={<AnimatedNumber value={gwRating} format={(n) => `${Math.round(n)}%`} />} icon={<Sparkles className="h-5 w-5 text-sky-600" />} />
            <div className="relative">
              <Kpi label="Bank" value={
                <div className="flex items-center gap-2">
                  <span>£<AnimatedNumber value={bank} /></span>
                  <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if (o) setBankInput(bank.toFixed(1)); }}>
                    <DialogTrigger asChild>
                      <Button aria-label="Edit bank" variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <div className="text-lg font-semibold">Edit Bank</div>
                        <div className="text-sm text-muted-foreground">Adjust available funds in your bank.</div>
                      </DialogHeader>
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5" />
                        <Input value={bankInput} onChange={(e)=>setBankInput(e.target.value)} inputMode="decimal" aria-label="Bank amount" />
                        <Button onClick={()=>{ const v = parseFloat(bankInput); if (!Number.isNaN(v)) { setBank(Number(v.toFixed(1))); setOpen(false); } }}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              } className="!px-3" />
            </div>
          </div>
        )}
        <div className="hidden items-center gap-2 md:flex">
          <Link href={{ pathname: "/players" }} className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Players
          </Link>
          <Link href={{ pathname: "/optimize" }} className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Optimize
          </Link>
          <Link href={{ pathname: "/import" }} className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            <UploadCloud className="mr-2 h-4 w-4" /> Import
          </Link>
        </div>
      </div>
    </header>
  );
}
