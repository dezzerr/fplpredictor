export class GeminiParseError extends Error {
  readonly context: string;
  readonly rawPreview: string;

  constructor(message: string, context: string, rawText: string) {
    super(message);
    this.name = 'GeminiParseError';
    this.context = context;
    this.rawPreview = rawText.slice(0, 1200);
  }
}

interface ParseGeminiJsonArrayOptions {
  context: string;
  arrayKeys?: string[];
  objectKeys?: string[];
}

function escapeControlCharsInsideStrings(text: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
      continue;
    }

    if (isEscaped) {
      result += ch;
      isEscaped = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      isEscaped = true;
      continue;
    }

    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }

    if (ch === '\n') {
      result += '\\n';
      continue;
    }

    if (ch === '\r') {
      result += '\\r';
      continue;
    }

    if (ch === '\t') {
      result += '\\t';
      continue;
    }

    result += ch;
  }

  return result;
}

function repairJsonLikeText(text: string): string {
  return escapeControlCharsInsideStrings(text)
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function tryParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const repaired = repairJsonLikeText(text);
    if (repaired !== text) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractTextFromParts(parts: unknown[]): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;

    const text = (part as { text?: unknown }).text;
    if (typeof text === 'string' && text.trim().length > 0) {
      chunks.push(text);
      continue;
    }

    const inlineData = (part as { inlineData?: { data?: unknown } }).inlineData;
    if (inlineData && typeof inlineData.data === 'string' && inlineData.data.trim().length > 0) {
      chunks.push(inlineData.data);
      continue;
    }

    const functionCall = (part as { functionCall?: { args?: unknown } }).functionCall;
    if (functionCall && functionCall.args !== undefined) {
      if (typeof functionCall.args === 'string' && functionCall.args.trim().length > 0) {
        chunks.push(functionCall.args);
        continue;
      }
      try {
        chunks.push(JSON.stringify(functionCall.args));
      } catch {
        // ignore non-serializable args
      }
    }
  }
  return chunks.join('\n').trim();
}

export function extractGeminiResponseText(resultOrResponse: unknown): string {
  const wrapped = resultOrResponse as { response?: unknown } | null;
  const response = wrapped && typeof wrapped === 'object' && 'response' in wrapped
    ? wrapped.response
    : resultOrResponse;

  if (!response || typeof response !== 'object') {
    return '';
  }

  const candidates = (response as { candidates?: unknown }).candidates;
  if (Array.isArray(candidates)) {
    const candidateTexts = candidates
      .map((candidate) => {
        if (!candidate || typeof candidate !== 'object') return '';
        const content = (candidate as { content?: { parts?: unknown[] } }).content;
        if (!content || !Array.isArray(content.parts)) return '';
        return extractTextFromParts(content.parts);
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (candidateTexts.length > 0) {
      return candidateTexts;
    }
  }

  const textFn = (response as { text?: unknown }).text;
  if (typeof textFn === 'function') {
    try {
      const text = (textFn as () => unknown)();
      if (typeof text === 'string' && text.trim().length > 0) {
        return text;
      }
    } catch {
      // fall through to candidate parsing
    }
  }

  return '';
}

function extractArrayFromObject(value: unknown, arrayKeys: string[]): unknown[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const obj = value as Record<string, unknown>;

  for (const key of arrayKeys) {
    if (Array.isArray(obj[key])) {
      return obj[key] as unknown[];
    }
  }

  const entries = Object.entries(obj);
  if (entries.length === 1 && Array.isArray(entries[0][1])) {
    return entries[0][1] as unknown[];
  }

  return null;
}

function recoverCompleteObjectsFromPartialArray(
  text: string,
  objectKeys: string[],
): unknown[] | null {
  const arrayStart = text.indexOf('[');
  if (arrayStart === -1) return null;

  let inString = false;
  let isEscaped = false;
  let arrayDepth = 0;
  let objectDepth = 0;
  let objectStart = -1;
  const recovered: Record<string, unknown>[] = [];

  for (let i = arrayStart; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (ch === '\\') {
        isEscaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[') {
      arrayDepth++;
      continue;
    }

    if (ch === ']') {
      arrayDepth--;
      continue;
    }

    if (arrayDepth <= 0) {
      continue;
    }

    if (ch === '{') {
      if (objectDepth === 0) {
        objectStart = i;
      }
      objectDepth++;
      continue;
    }

    if (ch === '}') {
      objectDepth--;
      if (objectDepth === 0 && objectStart !== -1) {
        const candidate = text.slice(objectStart, i + 1);
        const parsed = tryParseJson<unknown>(candidate);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (objectKeys.length === 0 || hasAnyObjectKey(parsed, objectKeys)) {
            recovered.push(parsed as Record<string, unknown>);
          }
        }
        objectStart = -1;
      }
      continue;
    }
  }

  return recovered.length > 0 ? recovered : null;
}

function extractAnyBalancedJsonObject(
  text: string,
  arrayKeys: string[],
  objectKeys: string[],
): unknown[] | null {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') starts.push(i);
  }

  for (const start of starts) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (ch === '\\') {
          isEscaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth++;
        continue;
      }

      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          const parsed = parseMaybeArrayOrWrappedObject(candidate, arrayKeys, objectKeys);
          if (parsed) {
            return parsed;
          }
          break;
        }
      }
    }
  }

  return null;
}

function hasAnyObjectKey(value: unknown, objectKeys: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value) || objectKeys.length === 0) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return objectKeys.some((key) => key in obj);
}

function extractObjectFromObjectDeep(value: unknown, objectKeys: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  if (hasAnyObjectKey(value, objectKeys)) {
    return value as Record<string, unknown>;
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    const nested = extractObjectFromObjectDeep(nestedValue, objectKeys);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function extractArrayFromObjectDeep(value: unknown, arrayKeys: string[]): unknown[] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const direct = extractArrayFromObject(value, arrayKeys);
  if (direct) {
    return direct;
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    const nested = extractArrayFromObjectDeep(nestedValue, arrayKeys);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function parseMaybeArrayOrWrappedObject(
  text: string,
  arrayKeys: string[],
  objectKeys: string[],
): unknown[] | null {
  const parsed = tryParseJson<unknown>(text);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (typeof parsed === 'string') {
    const nested = parseMaybeArrayOrWrappedObject(parsed.trim(), arrayKeys, objectKeys);
    if (nested) {
      return nested;
    }
  }

  const wrappedArray = extractArrayFromObjectDeep(parsed, arrayKeys);
  if (wrappedArray) {
    return wrappedArray;
  }

  const wrappedObject = extractObjectFromObjectDeep(parsed, objectKeys);
  if (wrappedObject) {
    return [wrappedObject];
  }

  return null;
}

function extractFencedBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    blocks.push((match[1] || '').trim());
  }

  return blocks;
}

function extractAnyBalancedJsonArray(text: string): unknown[] | null {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') starts.push(i);
  }

  for (const start of starts) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (ch === '\\') {
          isEscaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '[') {
        depth++;
        continue;
      }

      if (ch === ']') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          const parsed = tryParseJson<unknown>(candidate);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          break;
        }
      }
    }
  }

  return null;
}

function normalizeRawText(rawText: string): string {
  return rawText
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseGeminiJsonArray(
  rawText: string,
  options: ParseGeminiJsonArrayOptions,
): unknown[] {
  const { context, arrayKeys = [], objectKeys = [] } = options;
  const normalized = normalizeRawText(rawText || '');

  const directParsed = parseMaybeArrayOrWrappedObject(normalized, arrayKeys, objectKeys);
  if (directParsed) {
    return directParsed;
  }

  const fencedBlocks = extractFencedBlocks(normalized);
  for (const block of fencedBlocks) {
    const fencedParsed = parseMaybeArrayOrWrappedObject(block, arrayKeys, objectKeys);
    if (fencedParsed) {
      return fencedParsed;
    }

    const fencedArray = extractAnyBalancedJsonArray(block);
    if (fencedArray) {
      return fencedArray;
    }

    const fencedObject = extractAnyBalancedJsonObject(block, arrayKeys, objectKeys);
    if (fencedObject) {
      return fencedObject;
    }
  }

  const embeddedArray = extractAnyBalancedJsonArray(normalized);
  if (embeddedArray) {
    return embeddedArray;
  }

  const recoveredPartialArray = recoverCompleteObjectsFromPartialArray(normalized, objectKeys);
  if (recoveredPartialArray) {
    return recoveredPartialArray;
  }

  const embeddedObject = extractAnyBalancedJsonObject(normalized, arrayKeys, objectKeys);
  if (embeddedObject) {
    return embeddedObject;
  }

  throw new GeminiParseError(
    `[${context}] Failed to parse Gemini response as JSON array`,
    context,
    normalized,
  );
}
