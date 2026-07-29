"use client";

import { useState, useTransition, useEffect } from "react";
import { ArrowLeft, Search, Rocket, Download } from "lucide-react";
import { useSquadStore } from "@/store/squad";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { FPLManagerLookup } from "@/components/FPLManagerLookup";

interface MobileImportPageProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export function MobileImportPage({ onBack, onSuccess }: MobileImportPageProps) {
  const initialize = useSquadStore((s) => s.initialize);
  const lastImport = useSquadStore((s) => s.lastImport);
  const [inputMode, setInputMode] = useState<"id" | "manager">("id");
  const [entryId, setEntryId] = useState("");
  const [savedTeamId, setSavedTeamId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Load saved FPL team ID from profile on mount
  useEffect(() => {
    const loadSavedTeamId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fpl_team_id')
        .eq('id', user.id)
        .single();

      if (profile?.fpl_team_id) {
        setSavedTeamId(profile.fpl_team_id);
        setEntryId(profile.fpl_team_id.toString());
      }
    };
    loadSavedTeamId();
  }, []);

  const handleImport = () => {
    const id = entryId.trim();
    if (!id) {
      toast.error("Please enter your FPL ID");
      return;
    }

    startTransition(async () => {
      const res = await initialize({ entryId: id, preset: "baseline" });
      
      if (res.ok) {
        // Save the FPL team ID to the user's profile
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const teamIdNum = parseInt(id, 10);
          if (!isNaN(teamIdNum)) {
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                fpl_team_id: teamIdNum,
              }, {
                onConflict: 'id'
              });
            setSavedTeamId(teamIdNum);
          }
        }
        
        toast.success("Squad imported successfully!");
        onSuccess?.();
        onBack();
      } else {
        toast.error(res.error || "Failed to import squad");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Import Team</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-violet-500 via-violet-600 to-cyan-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Download className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Import Your FPL Team</h2>
              <p className="text-sm text-white/80">Sync your squad from Fantasy Premier League</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Saved Team ID Info */}
          {savedTeamId && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
              <div className="text-sm text-violet-200">
                <span className="font-medium">Saved Team ID:</span>{" "}
                <span className="font-mono">{savedTeamId}</span>
                <p className="text-xs text-violet-300 mt-1">
                  Your team ID is saved to your account. It will auto-fill when you sign in.
                </p>
              </div>
            </div>
          )}

          {/* Last Import Info */}
          {lastImport && !savedTeamId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-800">
                <span className="font-medium">Last imported:</span>{" "}
                {typeof lastImport === 'string' || typeof lastImport === 'number' 
                  ? `${new Date(lastImport).toLocaleDateString()} at ${new Date(lastImport).toLocaleTimeString()}`
                  : 'Recently'}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setInputMode("id")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  inputMode === "id"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Enter Team ID
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manager")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  inputMode === "manager"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Find FPL Team
              </button>
            </div>

            {inputMode === "manager" && (
              <FPLManagerLookup
                onSelect={(selectedEntryId) => {
                  setEntryId(selectedEntryId);
                  toast.success(`Selected Team ID ${selectedEntryId}`);
                }}
              />
            )}

            <label className="block text-sm font-medium text-slate-700">
              Enter your FPL Team ID
            </label>
            <input
              type="text"
              placeholder="e.g. 1234567"
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
          </div>

          {/* Help Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-slate-900">Where do I find my ID?</p>
                <p className="text-sm text-slate-600">
                  Go to the Points tab on the FPL website. Your ID is the number in the URL:
                </p>
                <div className="bg-white px-3 py-2 rounded border text-sm font-mono overflow-x-auto">
                  fantasy.premierleague.com/entry/<span className="text-violet-400 font-bold">1234567</span>/event/...
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">What gets imported:</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Your current 15-man squad
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Player prices and ownership
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Captain and vice-captain selections
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Available bank balance
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="border-t bg-white px-4 py-4 pb-safe">
        <button
          onClick={handleImport}
          disabled={pending || !entryId.trim()}
          className="w-full py-3.5 rounded-full font-semibold text-white bg-gradient-brand-cta hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Import Team
            </>
          )}
        </button>
      </div>
    </div>
  );
}
