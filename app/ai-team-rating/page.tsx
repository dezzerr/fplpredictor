"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FPLManagerLookup } from "@/components/FPLManagerLookup";
import { cn } from "@/lib/utils";
import type { Squad } from "@/lib/data";
import { Search, Check, Loader2, Lock, ArrowRight } from "lucide-react";
import { parseGameweek } from "@/lib/gameweek";

interface TeamRatingResult {
  overallRating: number;
  tier: "Elite" | "Strong" | "Competitive" | "Needs Work";
  summary: string;
  strengths: string[];
  risks: string[];
  captainPick: string;
  captainReason: string;
  projectedPoints: number;
  chipAdvice?: string;
}

interface TransferSuggestion {
  outPlayer: string;
  inPlayer: string;
  reason: string;
  expectedGain: number;
  confidence: "high" | "medium" | "low";
}

interface RatingApiResponse {
  rating?: TeamRatingResult;
  source?: "gemini" | "fallback";
  warning?: string;
  error?: string;
  managerContextAvailable?: boolean;
  personalizationWarnings?: string[];
}

interface TransferApiResponse {
  transfers?: TransferSuggestion[];
  source?: "gemini" | "optimizer_fallback";
  warning?: string;
  error?: string;
  managerContextAvailable?: boolean;
  personalizationWarnings?: string[];
}

export default function AiTeamRatingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputMode, setInputMode] = useState<"id" | "manager">("id");
  const [entryId, setEntryId] = useState("");
  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);
  const [rating, setRating] = useState<TeamRatingResult | null>(null);
  const [ratingMeta, setRatingMeta] = useState<{
    managerContextAvailable?: boolean;
    personalizationWarnings?: string[];
    source?: RatingApiResponse["source"];
  } | null>(null);

  const [transferLoading, setTransferLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [transfers, setTransfers] = useState<TransferSuggestion[]>([]);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [analysisChecks, setAnalysisChecks] = useState({
    first11: false,
    bench: false,
    captain: false,
    balance: false,
    differentials: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/deadline");
        if (!res.ok) return;
        const data = (await res.json()) as { eventId?: unknown };
        const eventId = parseGameweek(data.eventId);
        if (active && eventId) setCurrentGw(eventId);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadingRating && !transferLoading) return;

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        const next = Math.min(94, prev + Math.random() * 8 + 4);
        if (next > 15) setAnalysisChecks((c) => ({ ...c, first11: true }));
        if (next > 35) setAnalysisChecks((c) => ({ ...c, bench: true }));
        if (next > 50) setAnalysisChecks((c) => ({ ...c, captain: true }));
        if (next > 70) setAnalysisChecks((c) => ({ ...c, balance: true }));
        if (next > 85) setAnalysisChecks((c) => ({ ...c, differentials: true }));
        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [loadingRating, transferLoading]);

  const loadTeamAndRate = async () => {
    const teamId = entryId.trim();
    if (!/^\d+$/.test(teamId)) {
      setErrorMessage("Enter a valid numeric FPL Team ID.");
      return;
    }

    setErrorMessage("");
    setLoadingTeam(true);
    setLoadingRating(false);
    setErrorMessage("");
    setRatingMeta(null);
    setAnalysisChecks({
      first11: false,
      bench: false,
      captain: false,
      balance: false,
      differentials: false,
    });
    setStep(2);

    try {
      const squadRes = await fetch(
        `/api/squad?entryId=${encodeURIComponent(teamId)}&preset=baseline`,
        { cache: "no-store" }
      );
      const squadJson = (await squadRes.json()) as Squad & { error?: string };
      if (!squadRes.ok) {
        throw new Error(squadJson.error || "Could not load this FPL team.");
      }

      setSquad(squadJson as Squad);

      const ratingRes = await fetch("/api/ai/team-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "rating",
          squad: squadJson,
          gameweek: currentGw ?? undefined,
          entryId: teamId,
        }),
      });
      const ratingJson = (await ratingRes.json()) as RatingApiResponse;

      if (!ratingRes.ok || !ratingJson.rating) {
        throw new Error(ratingJson.error || "Could not generate a rating.");
      }

      setRating(ratingJson.rating);
      setRatingMeta({
        managerContextAvailable: ratingJson.managerContextAvailable,
        personalizationWarnings: ratingJson.personalizationWarnings || [],
        source: ratingJson.source,
      });
      setAnalysisProgress(100);
      setTimeout(() => {
        setLoadingTeam(false);
        setLoadingRating(false);
        setStep(3);
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load team.";
      setErrorMessage(msg);
      setLoadingTeam(false);
      setLoadingRating(false);
      setStep(1);
      setSquad(null);
      setRating(null);
    }
  };

  const getTransferSuggestions = async () => {
    if (!squad) {
      setErrorMessage("Load and rate a team first.");
      return;
    }

    setErrorMessage("");
    setTransferLoading(true);
    setAnalysisProgress(0);
    setAnalysisChecks({
      first11: false,
      bench: false,
      captain: false,
      balance: false,
      differentials: false,
    });

    try {
      const transferRes = await fetch("/api/ai/team-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "transfers",
          squad,
          gameweek: currentGw ?? undefined,
          entryId: entryId.trim(),
        }),
      });
      const transferJson = (await transferRes.json()) as TransferApiResponse;

      if (!transferRes.ok) {
        throw new Error(
          transferJson.error || "Failed to generate transfer suggestions."
        );
      }

      setTransfers(
        Array.isArray(transferJson.transfers) ? transferJson.transfers : []
      );

      setAnalysisProgress(100);
      setTimeout(() => {
        setTransferLoading(false);
        setPaywallVisible(true);
      }, 500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Transfer suggestion failed.";
      setTransferLoading(false);
      setAnalysisProgress(0);
      setErrorMessage(msg);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setEntryId("");
    setSquad(null);
    setRating(null);
    setTransfers([]);
    setPaywallVisible(false);
    setErrorMessage("");
    setAnalysisProgress(0);
    setAnalysisChecks({
      first11: false,
      bench: false,
      captain: false,
      balance: false,
      differentials: false,
    });
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
              step >= s
                ? "bg-violet-500 text-white"
                : "bg-slate-700 text-slate-400"
            )}
          >
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 4 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-1",
                step > s ? "bg-violet-500" : "bg-slate-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <PublicNavbar />

      {/* SEO Content - visible to search engines */}
      <div className="sr-only">
        <h1>Free FPL Team Rating & Transfer Recommendations</h1>
        <p>Get your Fantasy Premier League team rated for free. Receive personalized transfer suggestions to improve your FPL rank.</p>
      </div>

      <main className="container max-w-3xl mx-auto px-4 py-8">
        <StepIndicator />

        {/* Step 1: Input */}
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-3">
              Get your FPL team rated for free
            </h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Once you&apos;ve entered your team, we can help you optimise your
              line-up
            </p>

            <div className="max-w-md mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-900 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setInputMode("id")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === "id"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Enter Team ID
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("manager")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === "manager"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Find FPL Team
                </button>
              </div>

              {inputMode === "manager" && (
                <FPLManagerLookup
                  theme="dark"
                  onSelect={(selectedEntryId) => {
                    setEntryId(selectedEntryId);
                    setErrorMessage(`Selected Team ID ${selectedEntryId}.`);
                  }}
                />
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  value={entryId}
                  onChange={(e) => setEntryId(e.target.value)}
                  placeholder="Enter your FPL team ID"
                  className="pl-10 h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <Button
                onClick={loadTeamAndRate}
                disabled={loadingTeam}
                className="w-full h-12 bg-gradient-brand-cta hover:opacity-90 text-white font-semibold"
              >
                {loadingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>

              {errorMessage && (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-sm text-violet-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">ℹ</span>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500">
                Manager lookup uses official FPL endpoints only. If unavailable, enter Team ID directly.
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInputMode("id")}
                  className="text-violet-400 hover:text-violet-300 text-sm font-medium"
                >
                  Enter Team ID manually
                </button>
              </div>

              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-slate-500 text-sm">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <Link
                href="/squad"
                className="block text-violet-400 hover:text-violet-300 text-sm font-medium"
              >
                Enter team manually
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Analysing */}
        {step === 2 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Analysing your team
            </h1>
            <p className="text-slate-400 mb-8">
              This may take up to 10 seconds
            </p>

            <div className="max-w-md mx-auto space-y-4">
              {[
                { key: "first11", label: "Checked the strength of your first 11" },
                { key: "bench", label: "Looking at your bench depth" },
                { key: "captain", label: "Checking your captain choice" },
                { key: "balance", label: "Analysing your team balance" },
                { key: "differentials", label: "Looking for differentials" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {analysisChecks[key as keyof typeof analysisChecks] ? (
                      <Check className="w-4 h-4 text-violet-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        analysisChecks[key as keyof typeof analysisChecks]
                          ? "text-white"
                          : "text-slate-400"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all duration-500"
                      style={{
                        width:
                          analysisChecks[key as keyof typeof analysisChecks]
                            ? "100%"
                            : `${Math.max(0, analysisProgress - 20)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Rating Result */}
        {step === 3 && rating && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-3">
              Your team is rated {rating.overallRating}/100
            </h1>
            <p className="text-slate-400 mb-4">{rating.summary}</p>
            {ratingMeta && (
              <div className="mb-6 flex justify-center">
                <div className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  ratingMeta.managerContextAvailable
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                )}>
                  {ratingMeta.managerContextAvailable
                    ? "Personalized with official manager and chip context"
                    : ratingMeta.personalizationWarnings?.[0] || "Squad-only analysis"}
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto mb-8 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-sm font-semibold text-emerald-300 mb-2">Strengths</div>
                <div className="space-y-1 text-sm text-slate-300">
                  {rating.strengths.map((item) => (
                    <div key={item}>- {item}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-sm font-semibold text-amber-300 mb-2">Risks</div>
                <div className="space-y-1 text-sm text-slate-300">
                  {rating.risks.map((item) => (
                    <div key={item}>- {item}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                <div className="text-sm font-semibold text-violet-300 mb-1">Captain</div>
                <div className="text-sm text-white font-medium">{rating.captainPick}</div>
                <div className="text-xs text-slate-400">{rating.captainReason}</div>
              </div>
              {rating.chipAdvice && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <div className="text-sm font-semibold text-cyan-300 mb-1">Chip advice</div>
                  <div className="text-xs text-slate-300">{rating.chipAdvice}</div>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setStep(4);
                getTransferSuggestions();
              }}
              className="bg-gradient-brand-cta hover:opacity-90 text-white font-semibold px-8 py-3 h-auto"
            >
              Recommend transfers
            </Button>

            {squad && (
              <div className="mt-8 pitch-bg rounded-lg p-6 min-h-[400px] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-white/40 rounded-b-full" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-white/40 rounded-t-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
                </div>

                <div className="relative z-10 space-y-5 text-white text-xs">
                  {[
                    { label: "GK", players: squad.starters.GK, color: "bg-emerald-700" },
                    { label: "DEF", players: squad.starters.DEF, color: "bg-blue-600" },
                    { label: "MID", players: squad.starters.MID, color: "bg-red-600" },
                    { label: "FWD", players: squad.starters.FWD, color: "bg-red-700" },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-wrap justify-center gap-3">
                      {row.players.map((player) => (
                        <div key={player.id} className="w-20 text-center">
                          <div className={cn("w-11 h-11 rounded-lg mx-auto mb-1 flex items-center justify-center text-[10px] font-bold", row.color)}>
                            {player.position}
                          </div>
                          <div className="font-semibold truncate" title={player.name}>{player.name}</div>
                          <div className="text-slate-200 truncate">£{player.price.toFixed(1)}m • {player.team}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {squad.bench.length > 0 && (
                    <div className="border-t border-white/20 pt-4">
                      <div className="mb-2 text-[10px] uppercase tracking-wide text-white/70">Bench</div>
                      <div className="flex flex-wrap justify-center gap-3">
                        {squad.bench.map((player) => (
                          <div key={player.id} className="w-20 text-center opacity-80">
                            <div className="w-10 h-10 bg-slate-700 rounded-lg mx-auto mb-1 flex items-center justify-center text-[10px] font-bold">
                              {player.position}
                            </div>
                            <div className="font-semibold truncate" title={player.name}>{player.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Transfers with Paywall */}
        {step === 4 && (
          <div className="text-center">
            {transferLoading ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Analysing your team
                </h1>
                <p className="text-slate-400 mb-8">
                  This may take up to 10 seconds
                </p>

                <div className="max-w-md mx-auto space-y-4">
                  {[
                    { key: "first11", label: "Checked the strength of your first 11" },
                    { key: "bench", label: "Looking at your bench depth" },
                    { key: "captain", label: "Checking your captain choice" },
                    { key: "balance", label: "Analysing your team balance" },
                    { key: "differentials", label: "Looking for differentials" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        {analysisChecks[key as keyof typeof analysisChecks] ? (
                          <Check className="w-4 h-4 text-violet-500" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                        )}
                        <span
                          className={cn(
                            "text-sm",
                            analysisChecks[key as keyof typeof analysisChecks]
                              ? "text-white"
                              : "text-slate-400"
                          )}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-500"
                          style={{
                            width:
                              analysisChecks[key as keyof typeof analysisChecks]
                                ? "100%"
                                : `${Math.max(0, analysisProgress - 20)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : paywallVisible ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-3">
                  Make these transfers to increase your rating to {Math.min(99, (rating?.overallRating || 0) + 6)}/100
                </h1>
                <p className="text-slate-400 mb-8">
                  Our analysis suggests a few transfers to grab more points over
                  the next gameweeks
                </p>

                <div className="relative space-y-4 max-w-md mx-auto">
                  {transfers.slice(0, 3).map((transfer, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 rounded-lg p-4 blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-red-600 rounded-lg mx-auto mb-1" />
                          <div className="text-sm font-medium text-slate-400">
                            {transfer.outPlayer}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-red-500 text-sm font-semibold">
                            Out
                          </span>
                          <ArrowRight className="w-4 h-4 text-red-500" />
                          <span className="text-violet-500 text-sm font-semibold">
                            In
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-violet-600 rounded-lg mx-auto mb-1" />
                          <div className="text-sm font-medium text-slate-400">
                            {transfer.inPlayer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-center border border-slate-700">
                      <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <Button
                        asChild
                        className="bg-gradient-brand-cta hover:opacity-90 text-white font-semibold px-6"
                      >
                        <Link href="/login">Unlock all transfers</Link>
                      </Button>
                      <p className="mt-3 text-sm text-slate-400">
                        Already a member?{" "}
                        <Link href="/login" className="text-violet-400 hover:text-violet-300">
                          Log in
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-red-400">{errorMessage}</p>
                <Button onClick={resetFlow} className="mt-4 bg-slate-800 hover:bg-slate-700">
                  Try Again
                </Button>
              </div>
            )}

            {!transferLoading && !paywallVisible && errorMessage && (
              <Button onClick={resetFlow} variant="outline" className="mt-4 border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                Start Over
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
