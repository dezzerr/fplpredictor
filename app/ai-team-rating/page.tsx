"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Squad } from "@/lib/data";
import { Search, Check, Loader2, Lock, ArrowRight } from "lucide-react";

interface TeamRatingResult {
  overallRating: number;
  tier: "Elite" | "Strong" | "Competitive" | "Needs Work";
  summary: string;
  strengths: string[];
  risks: string[];
  captainPick: string;
  captainReason: string;
  projectedPoints: number;
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
}

interface TransferApiResponse {
  transfers?: TransferSuggestion[];
  source?: "gemini" | "optimizer_fallback";
  warning?: string;
  error?: string;
}

function parseEventId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

export default function AiTeamRatingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entryId, setEntryId] = useState("");
  const [currentGw, setCurrentGw] = useState(1);
  const [squad, setSquad] = useState<Squad | null>(null);

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);
  const [rating, setRating] = useState<TeamRatingResult | null>(null);

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
        const eventId = parseEventId(data.eventId);
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
    setLoadingRating(true);
    setAnalysisProgress(0);
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
          gameweek: currentGw,
        }),
      });
      const ratingJson = (await ratingRes.json()) as RatingApiResponse;

      if (!ratingRes.ok || !ratingJson.rating) {
        throw new Error(ratingJson.error || "Could not generate a rating.");
      }

      setRating(ratingJson.rating);
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
          gameweek: currentGw,
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
                ? "bg-fuchsia-500 text-white"
                : "bg-slate-700 text-slate-400"
            )}
          >
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 4 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-1",
                step > s ? "bg-fuchsia-500" : "bg-slate-700"
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
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold"
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
                <div className="rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 px-4 py-3 text-sm text-fuchsia-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">ℹ</span>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <div className="w-10 h-5 bg-slate-700 rounded-full relative">
                  <div className="w-4 h-4 bg-slate-500 rounded-full absolute left-0.5 top-0.5 shadow" />
                </div>
                <span>Include Manager Name</span>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button className="text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium">
                  Search by FPL ID
                </button>
              </div>

              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-slate-500 text-sm">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <Link
                href="/squad"
                className="block text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium"
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
                      <Check className="w-4 h-4 text-fuchsia-500" />
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
                      className="h-full bg-fuchsia-500 transition-all duration-500"
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
            <p className="text-slate-400 mb-8">
              To increase your team rating let our analysis give you some
              recommended transfers
            </p>

            <Button
              onClick={() => {
                setStep(4);
                getTransferSuggestions();
              }}
              className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold px-8 py-3 h-auto"
            >
              Recommend transfers
            </Button>

            {/* Team pitch visualization */}
            <div className="mt-8 pitch-bg rounded-lg p-8 min-h-[400px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-white/40 rounded-b-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-white/40 rounded-t-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
              </div>

              <div className="relative z-10 grid grid-cols-5 gap-4 text-white text-xs">
                <div className="col-span-5 flex justify-center gap-8 mb-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-700 rounded-lg mx-auto mb-1" />
                    <div className="font-semibold">Raya</div>
                    <div className="text-emerald-200">£6.0m • ARS</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-700 rounded-lg mx-auto mb-1" />
                    <div className="font-semibold">Dúbravka</div>
                    <div className="text-emerald-200">£4.0m • BUR</div>
                  </div>
                </div>

                <div className="col-span-5 flex justify-center gap-4 mb-4">
                  {["Guéhi", "J.Timber", "Hill", "Hall", "Kerkez"].map(
                    (name) => (
                      <div key={name} className="text-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg mx-auto mb-1" />
                        <div className="font-semibold">{name}</div>
                      </div>
                    )
                  )}
                </div>

                <div className="col-span-5 flex justify-center gap-4 mb-4">
                  {["B.Fernandes", "Semenyo", "Gordon", "Schade", "Rayan"].map(
                    (name) => (
                      <div key={name} className="text-center">
                        <div className="w-10 h-10 bg-red-600 rounded-lg mx-auto mb-1" />
                        <div className="font-semibold">{name}</div>
                      </div>
                    )
                  )}
                </div>

                <div className="col-span-5 flex justify-center gap-8">
                  {["Thiago", "Bowen", "Ekitiké"].map((name) => (
                    <div key={name} className="text-center">
                      <div className="w-10 h-10 bg-red-700 rounded-lg mx-auto mb-1" />
                      <div className="font-semibold">{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                          <Check className="w-4 h-4 text-fuchsia-500" />
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
                          className="h-full bg-fuchsia-500 transition-all duration-500"
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
                          <span className="text-fuchsia-500 text-sm font-semibold">
                            In
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-fuchsia-600 rounded-lg mx-auto mb-1" />
                          <div className="text-sm font-medium text-slate-400">
                            {transfer.inPlayer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-center border border-slate-700">
                      <div className="w-12 h-12 bg-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <Button
                        asChild
                        className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold px-6"
                      >
                        <Link href="/login">Unlock all transfers</Link>
                      </Button>
                      <p className="mt-3 text-sm text-slate-400">
                        Already a member?{" "}
                        <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300">
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
