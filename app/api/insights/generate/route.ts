import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { GeminiParseError, extractGeminiResponseText, parseGeminiJsonArray } from '@/lib/ai/parseGeminiResponse';

export const dynamic = 'force-dynamic';

const PROMPT = `You are an expert Fantasy Premier League (FPL) analyst. Analyse the following squad and return actionable insights as a JSON object with an \"insights\" array.

For each insight, return an object with:
- type: one of "captain", "form_hot", "form_cold", "fixture_easy", "fixture_hard", "rotation_risk", "transfer_out", "transfer_in", "differential", "value_pick"
- playerName: the player's name (or empty string for general tips)
- team: 3-letter team code (or empty string)
- title: short headline (max 8 words)
- detail: 1-2 sentence explanation
- sentiment: "positive", "negative", or "neutral"

Return 5-8 insights. Prioritise:
1. Best captain pick with reasoning
2. Players in hot/cold form based on their form stat
3. Fixture-based opportunities (easy upcoming fixtures) or risks (hard fixtures)
4. Weakest player to transfer out + who to bring in (same position, within budget)
5. Differential picks (low ownership, high expected points)

IMPORTANT: Only return valid JSON. No markdown or explanation.`;

const INSIGHT_ITEM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: { type: SchemaType.STRING },
    playerName: { type: SchemaType.STRING },
    team: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    detail: { type: SchemaType.STRING },
    sentiment: { type: SchemaType.STRING },
  },
  required: ['type', 'playerName', 'team', 'title', 'detail', 'sentiment'],
} satisfies Schema;

const INSIGHTS_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    insights: {
      type: SchemaType.ARRAY,
      items: INSIGHT_ITEM_SCHEMA,
    },
  },
  required: ['insights'],
} satisfies Schema;

const COMPACT_RETRY_PROMPT_SUFFIX = `
CRITICAL OUTPUT FORMAT:
- Return EXACTLY this shape: {"insights":[...]}.
- Return exactly 5 insights.
- Keep each detail <= 120 characters.
- Do not include newlines inside string values.
- Do not include markdown, comments, or any text outside JSON.
`;

export async function POST(request: Request) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('[Insights Generate] GEMINI_API_KEY is empty or not set');
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  console.log('[Insights Generate] GEMINI_API_KEY present');

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { players, gameweek, bank } = body;
  if (!Array.isArray(players) || players.length === 0) {
    return NextResponse.json({ error: 'No players provided' }, { status: 400 });
  }

  console.log(`[Insights Generate] Received ${players.length} players for GW${gameweek}`);

  // Build squad summary for Gemini
  const squadSummary = players.map((p: any) => {
    const fixtures = (p.fixtures || []).slice(0, 3).map((f: any) =>
      `${f.opp}(${f.H ? 'H' : 'A'}, FDR ${f.diff})`
    ).join(', ');
    return `${p.name} | ${p.position} | ${p.team} | £${p.price}m | Form: ${p.form} | Predicted: ${p.expPoints}pts | Minutes: ${Math.round((p.minutesProb || 0) * 100)}% | Ownership: ${p.ownership || '?'}% | Fixtures: ${fixtures || 'N/A'}`;
  }).join('\n');

  const positions = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) {
    if (positions[p.position as keyof typeof positions] !== undefined) {
      positions[p.position as keyof typeof positions]++;
    }
  }

  const context = `
SQUAD (GW${gameweek || '?'}, Bank: £${bank ?? '?'}m):
Formation: ${positions.GK} GK, ${positions.DEF} DEF, ${positions.MID} MID, ${positions.FWD} FWD

${squadSummary}
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: INSIGHTS_RESPONSE_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });

    console.log('[Insights Generate] Sending to Gemini...');

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
            const wait = (attempt + 1) * 5000; // 5s, 10s
            console.log(`[Insights Generate] Rate limited, retrying in ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, wait));
          } else {
            throw retryErr;
          }
        }
      }
      throw new Error('Gemini request failed after retries');
    };

    const basePrompt = `${PROMPT}\n\n${context}`;
    const parseRetryPrompt = `${basePrompt}\n\nCRITICAL OUTPUT FORMAT: Return only valid JSON. Return EXACTLY this shape: {\"insights\":[...]} Do not include markdown, comments, or any text outside JSON.`;
    const compactRetryPrompt = `${basePrompt}\n\n${COMPACT_RETRY_PROMPT_SUFFIX}`;
    const promptAttempts = [basePrompt, parseRetryPrompt, compactRetryPrompt];

    let insights: unknown[] | null = null;
    let lastParseError: unknown = null;

    for (let parseAttempt = 0; parseAttempt < promptAttempts.length; parseAttempt++) {
      const result = await generateWithBackoff(promptAttempts[parseAttempt]);
      const rawText = extractGeminiResponseText(result);
      console.log(`[Insights Generate] Gemini raw response attempt ${parseAttempt + 1} (first 300):`, rawText.slice(0, 300));

      try {
        insights = parseGeminiJsonArray(rawText, {
          context: 'Insights Generate',
          arrayKeys: ['insights'],
          objectKeys: ['type', 'title', 'detail', 'sentiment'],
        });
        break;
      } catch (parseErr) {
        lastParseError = parseErr;
        if (parseErr instanceof GeminiParseError) {
          console.error('[Insights Generate] JSON parse failed:', parseErr.message);
          console.error('[Insights Generate] Raw response preview:', parseErr.rawPreview);
        } else {
          console.error('[Insights Generate] JSON parse failed:', parseErr);
        }
        if (parseAttempt < promptAttempts.length - 1) {
          console.warn('[Insights Generate] Retrying Gemini with stricter JSON format prompt...');
          continue;
        }
      }
    }

    if (!insights) {
      const parseErr = lastParseError;
      if (parseErr instanceof GeminiParseError) {
        console.error('[Insights Generate] Final parse failure:', parseErr.message);
      }
      return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 500 });
    }

    // Sanitise
    const clean = insights.slice(0, 10).map((ins: any) => ({
      type: String(ins.type || 'neutral').toLowerCase(),
      playerName: String(ins.playerName || ''),
      team: String(ins.team || ''),
      title: String(ins.title || '').slice(0, 60),
      detail: String(ins.detail || '').slice(0, 250),
      sentiment: ['positive', 'negative', 'neutral'].includes(ins.sentiment) ? ins.sentiment : 'neutral',
    }));

    console.log(`[Insights Generate] Returning ${clean.length} insights`);
    return NextResponse.json({ insights: clean, gameweek });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    const stack = (err as Error).stack || '';
    console.error('[Insights Generate] Error:', msg);
    console.error('[Insights Generate] Stack:', stack.slice(0, 500));
    return NextResponse.json({ error: `Gemini error: ${msg}` }, { status: 500 });
  }
}
