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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-indigo-500" />
            Welcome to FPL Companion
          </DialogTitle>
          <DialogDescription className="pt-2">
            Let's get started by importing your Fantasy Premier League team. We'll sync your latest squad and prices.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enter your FPL Team ID
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 1234567"
                value={entryId}
                onChange={(e) => setEntryId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onImport()}
                className="font-mono"
                autoFocus
              />
            </div>
            
            <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground flex gap-3 items-start">
              <Search className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Where do I find my ID?</p>
                <p>
                  Go to the Points tab on the FPL website. Your ID is the number in the URL:
                </p>
                <code className="bg-background px-1 py-0.5 rounded border block mt-1 overflow-x-auto">
                  fantasy.premierleague.com/entry/<span className="text-indigo-500 font-bold">1234567</span>/event/...
                </code>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            I'll do this later
          </Button>
          <Button onClick={onImport} disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
            {pending ? "Importing..." : "Import Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
