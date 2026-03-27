/**
 * Gemini AI integration for extracting FPL player signals from scraped content.
 * Uses Gemini 2.0 Flash for structured JSON extraction.
 */

import { GoogleGenerativeAI, SchemaType, type GenerativeModel, type Schema } from '@google/generative-ai';
import type { ScrapedContent } from './scrapers';
import {
  GeminiParseError,
  extractGeminiResponseText,
  parseGeminiJsonArray,
} from './parseGeminiResponse';

export type SignalType =
  | 'starts'
  | 'benched'
  | 'injured'
  | 'returning'
  | 'hot_form'
  | 'cold_form'
  | 'rotation_risk'
  | 'set_piece_change';

export interface PlayerSignal {
  playerName: string;
  team: string;            // PL team short code (e.g. "LIV", "ARS")
  signal: SignalType;
  adjustment: number;      // -0.20 to +0.15
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

const SYSTEM_PROMPT = `You are an expert Fantasy Premier League (FPL) analyst. Your job is to extract player-level signals from news content that affect predicted FPL points.

For EACH player mentioned with a relevant signal, output a JSON object with these fields:
- playerName: The player's name as commonly known (e.g. "Salah", "Haaland", "Saka")
- team: The Premier League team 3-letter code. Use ONLY these codes: ARS, AVL, BOU, BRE, BHA, CHE, CRY, EVE, FUL, IPS, LEI, LIV, MCI, MUN, NEW, NFO, SOU, TOT, WHU, WOL
- signal: One of: "starts", "benched", "injured", "returning", "hot_form", "cold_form", "rotation_risk", "set_piece_change"
- adjustment: A float between -0.20 and +0.15 representing the percentage impact on predicted points:
  - "starts" (confirmed starter): +0.05 to +0.10
  - "benched" (confirmed benched/dropped): -0.15 to -0.20
  - "injured" (new injury): -0.15 to -0.20
  - "returning" (back from injury/ban): +0.05 to +0.15
  - "hot_form" (exceptional recent form): +0.05 to +0.10
  - "cold_form" (poor form, dropped): -0.05 to -0.10
  - "rotation_risk" (likely rotated): -0.05 to -0.10
  - "set_piece_change" (now on set pieces/penalties, or taken off them): -0.10 to +0.10
- confidence: "high" (manager quote, official), "medium" (reliable journalist), "low" (speculation, rumour)
- reason: A brief 1-sentence explanation

IMPORTANT RULES:
- Only extract signals about Premier League players
- Only extract signals that would meaningfully affect FPL points predictions
- Do NOT extract general match previews or tactical analysis without player-specific info
- If no relevant signals are found, return an empty array
- Be conservative with adjustments — only large confidence signals should get max adjustments
- Return a JSON array of objects. No markdown, no explanation — just the JSON array.`;

const SIGNALS_RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      playerName: { type: SchemaType.STRING },
      team: { type: SchemaType.STRING },
      signal: { type: SchemaType.STRING },
      adjustment: { type: SchemaType.NUMBER },
      confidence: { type: SchemaType.STRING },
      reason: { type: SchemaType.STRING },
    },
    required: ['playerName', 'team', 'signal', 'adjustment', 'confidence', 'reason'],
  },
} satisfies Schema;

let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not set');
    return null;
  }
  if (!_model) {
    const genAI = new GoogleGenerativeAI(apiKey);
    _model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SIGNALS_RESPONSE_SCHEMA,
        temperature: 0.1, // low temperature for consistent structured output
        maxOutputTokens: 4096,
      },
    });
  }
  return _model;
}

/**
 * Extract player signals from a batch of scraped content using Gemini.
 * Content is batched into a single prompt to minimize API calls.
 */
export async function extractSignals(content: ScrapedContent[]): Promise<PlayerSignal[]> {
  const model = getModel();
  if (!model) return [];
  if (content.length === 0) return [];

  // Build the content block — each source separated clearly
  const contentBlock = content.map((c, i) => {
    return `--- Source ${i + 1}: ${c.source} (${c.sourceType}) [${c.date}] ---\n${c.text}`;
  }).join('\n\n');

  // If content is very large, split into chunks
  const MAX_CHARS = 100_000; // ~25K tokens for Gemini
  const chunks: string[] = [];
  if (contentBlock.length <= MAX_CHARS) {
    chunks.push(contentBlock);
  } else {
    // Split by source boundaries
    let current = '';
    for (const c of content) {
      const block = `--- Source: ${c.source} (${c.sourceType}) [${c.date}] ---\n${c.text}\n\n`;
      if (current.length + block.length > MAX_CHARS && current.length > 0) {
        chunks.push(current);
        current = block;
      } else {
        current += block;
      }
    }
    if (current.length > 0) chunks.push(current);
  }

  const allSignals: PlayerSignal[] = [];

  for (const chunk of chunks) {
    try {
      const generateWithBackoff = async (promptText: string) => {
        let result: any;
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            result = await model.generateContent(promptText);
            return result;
          } catch (retryErr: any) {
            const is429 = retryErr?.message?.includes('429') || retryErr?.message?.includes('quota');
            if (is429 && attempt < maxRetries) {
              const wait = (attempt + 1) * 5000;
              console.log(`[Gemini] Rate limited, retrying in ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(r => setTimeout(r, wait));
            } else {
              throw retryErr;
            }
          }
        }
        throw new Error('Gemini signal request failed after retries');
      };

      const basePrompt = `${SYSTEM_PROMPT}\n\nContent to analyze:\n\n${chunk}`;
      const parseRetryPrompt = `${basePrompt}\n\nCRITICAL OUTPUT FORMAT: Return only valid JSON. Do not include markdown, comments, or any text outside a JSON array.`;
      const promptAttempts = [basePrompt, parseRetryPrompt];

      let signals: PlayerSignal[] | null = null;
      let lastParseError: unknown = null;

      for (let parseAttempt = 0; parseAttempt < promptAttempts.length; parseAttempt++) {
        const result = await generateWithBackoff(promptAttempts[parseAttempt]);
        const text = extractGeminiResponseText(result);

        try {
          const parsed = parseGeminiJsonArray(text, {
            context: 'Signal Extraction',
            arrayKeys: ['signals'],
            objectKeys: ['playerName', 'team', 'signal', 'adjustment', 'confidence', 'reason'],
          });
          signals = parsed as PlayerSignal[];
          break;
        } catch (parseErr) {
          lastParseError = parseErr;
          if (parseErr instanceof GeminiParseError) {
            console.error('[Gemini] Signal parse error:', parseErr.message);
            console.error('[Gemini] Raw response preview:', parseErr.rawPreview);
          } else {
            console.error('[Gemini] Signal parse error:', parseErr);
          }

          if (parseAttempt < promptAttempts.length - 1) {
            console.warn('[Gemini] Retrying chunk with stricter JSON format prompt...');
            continue;
          }
        }
      }

      if (!signals) {
        if (lastParseError) {
          throw lastParseError;
        }
        throw new Error('Failed to parse Gemini signals response');
      }

      // Validate and sanitize each signal
      for (const sig of signals) {
        if (!sig.playerName || !sig.team || !sig.signal) continue;
        const valid: PlayerSignal = {
          playerName: String(sig.playerName).trim(),
          team: String(sig.team).toUpperCase().trim(),
          signal: sig.signal as SignalType,
          adjustment: Math.max(-0.20, Math.min(0.15, Number(sig.adjustment) || 0)),
          confidence: (['high', 'medium', 'low'].includes(sig.confidence) ? sig.confidence : 'low') as 'high' | 'medium' | 'low',
          reason: String(sig.reason || '').slice(0, 200),
        };
        allSignals.push(valid);
      }
    } catch (err) {
      if (err instanceof GeminiParseError) {
        console.error('[Gemini] Signal parse error:', err.message);
        console.error('[Gemini] Raw response preview:', err.rawPreview);
      } else {
        console.error('[Gemini] Signal extraction error:', (err as Error).message);
      }
      throw err;
    }
  }

  // Deduplicate: keep highest confidence signal per player+signal type
  const deduped = new Map<string, PlayerSignal>();
  const confRank = { high: 3, medium: 2, low: 1 };
  for (const sig of allSignals) {
    const key = `${sig.playerName.toLowerCase()}|${sig.team}|${sig.signal}`;
    const existing = deduped.get(key);
    if (!existing || confRank[sig.confidence] > confRank[existing.confidence]) {
      deduped.set(key, sig);
    }
  }

  return Array.from(deduped.values());
}
