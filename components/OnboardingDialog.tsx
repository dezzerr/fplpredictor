"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSquadStore } from "@/store/squad";
import { toast } from "sonner";
import { Rocket, Search } from "lucide-react";

export function OnboardingDialog() {
  const lastImport = useSquadStore((s) => s.lastImport);
  const initialize = useSquadStore((s) => s.initialize);
  const [open, setOpen] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [pending, startTransition] = useTransition();

  // Show dialog if user hasn't imported a team yet
  useEffect(() => {
    // Small delay to allow hydration and smooth entrance
    const timer = setTimeout(() => {
      if (!lastImport) {
        setOpen(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [lastImport]);

  const onImport = () => {
    const id = entryId.trim();
    if (!id) {
      toast.error("Please enter your FPL ID");
      return;
    }

    startTransition(async () => {
      const res = await initialize({ entryId: id, preset: "baseline" });
      
      if (res.ok) {
        toast.success("Squad imported successfully!");
        setOpen(false);
        // Show a follow-up tip after a short delay
        setTimeout(() => {
          toast.info("Tip: Click 'Auto-Select Best XI' to see your optimal lineup!", {
            duration: 6000,
            icon: <Rocket className="h-4 w-4 text-indigo-500" />
          });
        }, 1500);
      } else {
        toast.error(res.error || "Failed to import squad");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[440px] p-0 overflow-hidden [&>button[aria-label=Close]]:text-white/90 [&>button[aria-label=Close]]:hover:bg-white/15"
      >
        {/* Brand header */}
        <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-6 pt-6 pb-7 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold leading-tight">
                Welcome to FPL Companion
              </DialogTitle>
              <DialogDescription className="text-[13px] text-white/80 mt-0.5">
                Sync your squad in seconds.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-5 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Import your Fantasy Premier League team to unlock live scoring, AI insights and optimised lineups tailored to you.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="fpl-entry-id"
              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
            >
              FPL Team ID
            </label>
            <Input
              id="fpl-entry-id"
              placeholder="e.g. 1234567"
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onImport()}
              className="h-11 font-mono text-base"
              inputMode="numeric"
              autoFocus
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 h-6 w-6 shrink-0 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center">
                <Search className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="text-[13px] font-semibold text-slate-900">
                  Where do I find my ID?
                </p>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Open the <span className="font-medium text-slate-800">Points</span> tab on the FPL site — your ID is the number in the URL.
                </p>
                <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-700 break-all">
                  fantasy.premierleague.com/entry/
                  <span className="font-bold text-violet-600">1234567</span>
                  /event/…
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 !mt-0 flex-row items-center justify-between gap-3 sm:space-x-0">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-slate-600 hover:text-slate-900"
          >
            I&apos;ll do this later
          </Button>
          <Button
            onClick={onImport}
            disabled={pending}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm px-5"
          >
            {pending ? "Importing…" : "Import Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
