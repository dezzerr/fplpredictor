import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type GenerativeModel, type Schema } from "@google/generative-ai";
import { fetchPlayersWithMarket } from "@/lib/market";
import { pickXIForWeek, recommendTransfers, selectDiverseTransferPlans, type PlanResult } from "@/lib/optimizer";
import { TEAM_RATING_BENCHMARK } from "@/lib/constants";
import type { Player, Squad } from "@/lib/data";
import { extractGeminiResponseText, parseGeminiJsonArray } from "@/lib/ai/parseGeminiResponse";
import {
  buildChipContextText,
  buildManagerContextText,
  fetchManagerContext,
  isValidEntryId,
  type ManagerContext,
} from "@/lib/fplManagerContext";
import { fetchOfficialPlanningGameweek, parseGameweek } from "@/lib/gameweek";
import { protectRequest } from "@/lib/request-security";

export const dynamic = "force-dynamic";

type Intent = "rating" | "transfers";

interface TeamRatingPayload {
  intent?: Intent;
  squad?: Squad;
  gameweek?: number;
  entryId?: string;
}

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

const RATING_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      overallRating: { type: SchemaType.NUMBER },
      tier: { type: SchemaType.STRING },
      summary: { type: SchemaType.STRING },
      strengths: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      risks: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      captainPick: { type: SchemaType.STRING },
      captainReason: { type: SchemaType.STRING },
      chipAdvice: { type: SchemaType.STRING },
    },
    required: ["overallRating", "tier", "summary", "strengths", "risks", "captainPick", "captainReason"],
  },
} satisfies Schema;

const TRANSFER_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      outPlayer: { type: SchemaType.STRING },
      inPlayer: { type: SchemaType.STRING },
      reason: { type: SchemaType.STRING },
      expectedGain: { type: SchemaType.NUMBER },
      confidence: { type: SchemaType.STRING },
    },
    required: ["outPlayer", "inPlayer", "reason", "expectedGain", "confidence"],
  },
} satisfies Schema;

const TIER_VALUES: TeamRatingResult["tier"][] = ["Elite", "Strong", "Competitive", "Needs Work"];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function sixtyMinuteChance(p: Player): number {
  return clamp(toNumber(p.playingTime?.sixtyMinuteProbability, toNumber(p.minutesProb, 0.8)), 0, 1);
}

function expectedMinutes(p: Player): number {
  return clamp(toNumber(p.playingTime?.expectedMinutes, sixtyMinuteChance(p) * 90), 0, 90);
}

function toRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function toText(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function toTextArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function flattenSquad(squad: Squad): Player[] {
  return [
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ];
}

function isLikelySquad(squad: unknown): squad is Squad {
  if (!squad || typeof squad !== "object") return false;
  const s = squad as Partial<Squad>;
  return Boolean(
    s.starters &&
      typeof s.bank === "number" &&
      Array.isArray(s.starters.GK) &&
      Array.isArray(s.starters.DEF) &&
      Array.isArray(s.starters.MID) &&
      Array.isArray(s.starters.FWD) &&
      Array.isArray(s.bench),
  );
}

function getCaptainNameFromSquad(squad: Squad, captainId: string): string {
  const all = flattenSquad(squad);
  return all.find((p) => p.id === captainId)?.name || "Best projected player";
}

function scorePlayer(p: Player): number {
  // usage-v2 availability is already included in expPoints.
  return toNumber(p.expPoints, 0);
}

function tierFromRating(rating: number): TeamRatingResult["tier"] {
  if (rating >= 86) return "Elite";
  if (rating >= 74) return "Strong";
  if (rating >= 58) return "Competitive";
  return "Needs Work";
}

function buildFallbackRating(squad: Squad): TeamRatingResult {
  const players = flattenSquad(squad);
  const optimized = pickXIForWeek(squad, 0);
  const projectedPoints = Number.isFinite(optimized.points) ? optimized.points : 0;
  // Keep the AI fallback on the same scale as the squad KPI: projected points
  // include the captain's extra return, so divide by 12 effective slots.
  const overallRating = clamp(
    Math.round(((projectedPoints / 12) / TEAM_RATING_BENCHMARK) * 100),
    35,
    99,
  );
  const sorted = [...players].sort((a, b) => scorePlayer(b) - scorePlayer(a));
  const topCore = sorted.slice(0, 3).map((p) => p.name).join(", ");
  const flagged = players.filter((p) => p.status !== "fit").length;
  const lowMinutes = players.filter((p) => sixtyMinuteChance(p) < 0.72).length;
  const easyFixtures = players.filter((p) => (p.nextFixtures?.[0]?.diff ?? 3) <= 2).length;
  const captainPick = getCaptainNameFromSquad(squad, optimized.capId);
  const tier = tierFromRating(overallRating);

  const strengths = [
    topCore ? `Reliable core: ${topCore}` : "Reliable premium core in attack",
    `${easyFixtures} players have favorable next fixtures`,
    `${players.filter((p) => sixtyMinuteChance(p) >= 0.85).length} players project as high-minute starters`,
  ];

  const risks = [
    `${lowMinutes} players have uncertain minutes`,
    flagged > 0 ? `${flagged} flagged availability concerns in squad` : "Few bench spots with strong upside",
    "Depth can be improved to reduce one-week variance",
  ];

  return {
    overallRating,
    tier,
    summary: `Projected around ${projectedPoints.toFixed(1)} points with ${captainPick} as standout captain.`,
    strengths,
    risks,
    captainPick,
    captainReason: `${captainPick} leads your team on projected points this gameweek.`,
    projectedPoints: Number(projectedPoints.toFixed(1)),
  };
}

function buildFallbackChipAdvice(managerContext: ManagerContext | null, squad: Squad, gameweek?: number): string {
  if (!managerContext) return "Chip history unavailable, so chip advice is based on squad projections only.";
  const optimized = pickXIForWeek(squad, 0);
  const captain = flattenSquad(squad).find((p) => p.id === optimized.capId);
  const benchProjection = optimized.bench.reduce((sum, p) => sum + scorePlayer(p), 0);
  const chipContext = buildChipContextText(managerContext.chipUsage, gameweek);

  if (managerContext.chipUsage.playedThisGw) {
    return `${chipContext} Do not plan another chip this gameweek.`;
  }

  if (managerContext.chipUsage.available.length === 0) {
    return `${chipContext} Focus on captaincy and transfers because no major chips remain.`;
  }

  if (managerContext.chipUsage.available.includes("BB") && benchProjection >= 11.5) {
    return `${chipContext} Bench Boost is viable because the bench projects around ${benchProjection.toFixed(1)} points.`;
  }

  if (managerContext.chipUsage.available.includes("TC") && captain && scorePlayer(captain) >= 7.5) {
    return `${chipContext} Triple Captain is viable if you trust ${captain.name}'s minutes and fixture.`;
  }

  return `${chipContext} No chip has a clear trigger, so holding is preferred.`;
}

function confidenceFromGain(gain: number): TransferSuggestion["confidence"] {
  if (gain >= 4.5) return "high";
  if (gain >= 2) return "medium";
  return "low";
}

function buildFallbackTransfers(plans: PlanResult[], squad: Squad): TransferSuggestion[] {
  const squadById = new Map(flattenSquad(squad).map((p) => [p.id, p]));
  const singleMoves = selectDiverseTransferPlans(
    plans.filter((p) => p.transfers.length === 1),
    4,
  );
  return singleMoves.map((plan) => {
    const move = plan.transfers[0];
    const outPlayer = squadById.get(move.outId);
    return {
      outPlayer: outPlayer?.name || "Current player",
      inPlayer: move.inPlayer.name,
      reason: `Model projects +${plan.netGain.toFixed(1)} net points over the next horizon with this move.`,
      expectedGain: Number(plan.netGain.toFixed(1)),
      confidence: confidenceFromGain(plan.netGain),
    };
  });
}

function createModel(apiKey: string, schema: Schema): GenerativeModel {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.15,
      maxOutputTokens: 1800,
    },
  });
}

async function generateWithBackoff(model: GenerativeModel, prompt: string) {
  const maxRetries = 2;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimited = message.includes("429") || message.toLowerCase().includes("quota");
      if (!isRateLimited || attempt >= maxRetries) break;
      const waitMs = 3500 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastErr;
}

function sanitizeRating(raw: unknown, fallback: TeamRatingResult): TeamRatingResult {
  const obj = toRecord(raw);
  const overallRating = clamp(Math.round(toNumber(obj.overallRating, fallback.overallRating)), 35, 99);
  const tierValue = toText(obj.tier, fallback.tier);
  const tier = TIER_VALUES.includes(tierValue as TeamRatingResult["tier"])
    ? (tierValue as TeamRatingResult["tier"])
    : tierFromRating(overallRating);

  const strengths = toTextArray(obj.strengths).slice(0, 3);
  const risks = toTextArray(obj.risks).slice(0, 3);

  return {
    overallRating,
    tier,
    summary: toText(obj.summary, fallback.summary).slice(0, 220),
    strengths: strengths.length > 0 ? strengths : fallback.strengths,
    risks: risks.length > 0 ? risks : fallback.risks,
    captainPick: toText(obj.captainPick, fallback.captainPick).slice(0, 50),
    captainReason: toText(obj.captainReason, fallback.captainReason).slice(0, 140),
    projectedPoints: fallback.projectedPoints,
    chipAdvice: toText(obj.chipAdvice, fallback.chipAdvice || "").slice(0, 220) || fallback.chipAdvice,
  };
}

function sanitizeTransfers(raw: unknown[], fallback: TransferSuggestion[]): TransferSuggestion[] {
  const normalized = raw
    .map((item) => {
      const obj = toRecord(item);
      const confidence = toText(obj.confidence, "medium").toLowerCase();
      return {
        outPlayer: toText(obj.outPlayer),
        inPlayer: toText(obj.inPlayer),
        reason: toText(obj.reason).slice(0, 180),
        expectedGain: Number(toNumber(obj.expectedGain, 0).toFixed(1)),
        confidence: (confidence === "high" || confidence === "medium" || confidence === "low"
          ? confidence
          : "medium") as TransferSuggestion["confidence"],
      };
    })
    .filter((item) => item.outPlayer && item.inPlayer && item.reason)
    .slice(0, 4);

  // Keep the AI output useful even when the model repeats the same weak player
  // with several incoming alternatives. Fill duplicate slots from the
  // diversified deterministic fallback instead of showing repetitive advice.
  const result: TransferSuggestion[] = [];
  const seenOutgoing = new Set<string>();
  for (const suggestion of [...normalized, ...fallback]) {
    const outgoingKey = suggestion.outPlayer.trim().toLowerCase();
    if (!outgoingKey || seenOutgoing.has(outgoingKey)) continue;
    seenOutgoing.add(outgoingKey);
    result.push(suggestion);
    if (result.length >= 4) break;
  }

  return result;
}

function formatPlayersForPrompt(squad: Squad): string {
  const players = flattenSquad(squad);
  return players
    .map((p) => {
      const fixtures = (p.nextFixtures || [])
        .slice(0, 3)
        .map((f) => `${f.opp}(${f.H ? "H" : "A"},FDR${f.diff})`)
        .join(", ");
      return `${p.name} | ${p.position} | ${p.team} | £${p.price.toFixed(1)}m | EP ${toNumber(p.expPoints, 0).toFixed(1)} | xMins ${expectedMinutes(p).toFixed(0)} | P60 ${Math.round(sixtyMinuteChance(p) * 100)}% | Form ${toNumber(p.form, 0).toFixed(1)} | ${fixtures || "No fixtures"}`;
    })
    .join("\n");
}

export async function POST(request: NextRequest) {
  const protection = await protectRequest(request, "ai-team-rating", 10, 60_000);
  if (protection) return protection;

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let body: TeamRatingPayload;
  try {
    body = (await request.json()) as TeamRatingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const intent: Intent = body.intent === "transfers" ? "transfers" : "rating";
  if (!isLikelySquad(body.squad)) {
    return NextResponse.json({ error: "Valid squad payload is required" }, { status: 400 });
  }

  const squad = body.squad;
  const playersSummary = formatPlayersForPrompt(squad);
  const requestGameweek = parseGameweek(body.gameweek);
  const gameweek = requestGameweek ?? await fetchOfficialPlanningGameweek() ?? undefined;
  const entryIdRaw = typeof body.entryId === "string" ? body.entryId.trim() : "";
  const entryId = isValidEntryId(entryIdRaw) ? entryIdRaw : null;
  const managerContext = entryId ? await fetchManagerContext(entryId, gameweek) : null;
  const fallbackRating: TeamRatingResult = {
    ...buildFallbackRating(squad),
    chipAdvice: buildFallbackChipAdvice(managerContext, squad, gameweek),
  };

  if (intent === "rating") {
    const ratingPrompt = `You are an elite Fantasy Premier League analyst.\nReturn JSON only.\nReturn an array with EXACTLY one object containing:\n- overallRating (0-100 integer)\n- tier (Elite|Strong|Competitive|Needs Work)\n- summary (max 180 chars)\n- strengths (array of 3 short strings)\n- risks (array of 3 short strings)\n- captainPick (player name)\n- captainReason (max 120 chars)\n- chipAdvice (max 180 chars, must respect used/available chips)\n\nManager context:\n${buildManagerContextText(managerContext)}\n\nContext:\n- Gameweek: ${gameweek ?? "current"}\n- Baseline projected points: ${fallbackRating.projectedPoints}\n- Baseline rating: ${fallbackRating.overallRating}\n- Bank: £${squad.bank.toFixed(1)}m\n- Fallback chip advice: ${fallbackRating.chipAdvice || "Unavailable"}\n\nSquad:\n${playersSummary}\n\nKeep output practical and user-facing. Do not invent chip usage if manager context is unavailable. Chip availability in Manager context is authoritative: never recommend a chip unless it is listed as available, and never describe an active or used chip as available.`;

    try {
      const model = createModel(apiKey, RATING_SCHEMA);
      const result = await generateWithBackoff(model, ratingPrompt);
      const rawText = extractGeminiResponseText(result);
      const parsed = parseGeminiJsonArray(rawText, {
        context: "AI Team Rating",
        objectKeys: ["overallRating", "summary", "captainPick"],
      });
      const rating = sanitizeRating(parsed[0], fallbackRating);

      return NextResponse.json({
        rating,
        source: "gemini",
        managerContextAvailable: !!managerContext,
        personalizationWarnings: managerContext
          ? []
          : ["Manager context unavailable; rating is based on squad players only."],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AI Team Rating] Gemini rating failed:", msg);
      return NextResponse.json({
        rating: fallbackRating,
        source: "fallback",
        managerContextAvailable: !!managerContext,
        personalizationWarnings: managerContext
          ? []
          : ["Manager context unavailable; rating is based on squad players only."],
        warning: "Gemini rating unavailable. Showing model fallback.",
      });
    }
  }

  let plans: PlanResult[] = [];
  try {
    const universe = await fetchPlayersWithMarket("baseline");
    plans = recommendTransfers({
      squad,
      players: universe,
      weeks: 3,
      allowedFreeTransfers: 1,
      hitCostPerExtra: 4,
      maxTransfersToConsider: 2,
      perPosCandidateLimit: 16,
    })
      .filter((plan) => plan.transfers.length === 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI Team Rating] Transfer candidate generation failed:", msg);
  }

  const diversePlans = selectDiverseTransferPlans(
    plans.filter((plan) => plan.transfers.length === 1),
    12,
  );
  const fallbackTransfers = buildFallbackTransfers(diversePlans, squad);
  if (plans.length === 0) {
    return NextResponse.json({
      transfers: fallbackTransfers,
      source: "optimizer_fallback",
      paywallLocked: true,
      managerContextAvailable: !!managerContext,
      personalizationWarnings: managerContext
        ? []
        : ["Manager context unavailable; transfers are based on squad players only."],
    });
  }

  const squadById = new Map(flattenSquad(squad).map((p) => [p.id, p]));
  const candidateLines = diversePlans
    .map((plan, index) => {
      const move = plan.transfers[0];
      const outPlayer = squadById.get(move.outId);
      return `${index + 1}. OUT ${outPlayer?.name || move.outId} (${outPlayer?.position || "?"}) -> IN ${move.inPlayer.name} (${move.inPlayer.position}) | Net gain ${plan.netGain.toFixed(1)} | Projected ${plan.projected.toFixed(1)}`;
    })
    .join("\n");

  const transferPrompt = `You are an elite FPL transfer strategist.\nUse ONLY these candidate transfers and return exactly 3 suggestions.\nEach suggestion must use a different transfer-out player whenever at least 3 distinct outgoing players are available. Do not repeat an outgoing player with a different incoming player.\nOutput must be a JSON array with objects containing:\n- outPlayer\n- inPlayer\n- reason (max 160 chars)\n- expectedGain (number)\n- confidence (high|medium|low)\n\nManager context:\n${buildManagerContextText(managerContext)}\n\nCandidate transfer plans:\n${candidateLines}\n\nPrioritise highest net gains with realistic risk commentary. Account for the manager's chip and transfer state. Chip availability in Manager context is authoritative: never recommend a chip unless it is listed as available, and never describe an active or used chip as available.`;

  try {
    const model = createModel(apiKey, TRANSFER_SCHEMA);
    const result = await generateWithBackoff(model, transferPrompt);
    const rawText = extractGeminiResponseText(result);
    const parsed = parseGeminiJsonArray(rawText, {
      context: "AI Team Transfers",
      objectKeys: ["outPlayer", "inPlayer", "reason", "expectedGain"],
    });

    return NextResponse.json({
      transfers: sanitizeTransfers(parsed, fallbackTransfers),
      source: "gemini",
      paywallLocked: true,
      managerContextAvailable: !!managerContext,
      personalizationWarnings: managerContext
        ? []
        : ["Manager context unavailable; transfers are based on squad players only."],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI Team Rating] Gemini transfers failed:", msg);
    return NextResponse.json({
      transfers: fallbackTransfers,
      source: "optimizer_fallback",
      paywallLocked: true,
      managerContextAvailable: !!managerContext,
      personalizationWarnings: managerContext
        ? []
        : ["Manager context unavailable; transfers are based on squad players only."],
      warning: "Gemini transfer ranking unavailable. Showing model fallback.",
    });
  }
}
