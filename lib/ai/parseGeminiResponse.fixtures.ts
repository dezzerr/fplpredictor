export interface GeminiJsonArrayFixtureOptions {
  context: string;
  arrayKeys?: string[];
}

export interface GeminiJsonArraySuccessFixture {
  name: string;
  rawText: string;
  options: GeminiJsonArrayFixtureOptions;
  expected: unknown[];
}

export interface GeminiJsonArrayErrorFixture {
  name: string;
  rawText: string;
  options: GeminiJsonArrayFixtureOptions;
}

export const GEMINI_JSON_ARRAY_SUCCESS_FIXTURES: GeminiJsonArraySuccessFixture[] = [
  {
    name: 'plain-json-array',
    rawText: '[{"type":"captain","playerName":"Salah"}]',
    options: { context: 'Fixture: plain array' },
    expected: [{ type: 'captain', playerName: 'Salah' }],
  },
  {
    name: 'markdown-fenced-json-array',
    rawText: '```json\n[{"signal":"hot_form","playerName":"Saka"}]\n```',
    options: { context: 'Fixture: fenced array' },
    expected: [{ signal: 'hot_form', playerName: 'Saka' }],
  },
  {
    name: 'wrapped-by-known-array-key',
    rawText: '{"insights":[{"title":"Captaincy pick"}]}',
    options: { context: 'Fixture: wrapped known key', arrayKeys: ['insights'] },
    expected: [{ title: 'Captaincy pick' }],
  },
  {
    name: 'wrapped-by-single-unknown-key',
    rawText: '{"payload":[{"signal":"rotation_risk"}]}',
    options: { context: 'Fixture: wrapped unknown key' },
    expected: [{ signal: 'rotation_risk' }],
  },
  {
    name: 'noisy-prefix-suffix-with-embedded-array',
    rawText: 'Here are the results:\n[{"team":"ARS","sentiment":"positive"}]\nDone.',
    options: { context: 'Fixture: embedded array' },
    expected: [{ team: 'ARS', sentiment: 'positive' }],
  },
  {
    name: 'bom-prefixed-array',
    rawText: '\uFEFF[{"playerName":"Haaland"}]',
    options: { context: 'Fixture: BOM array' },
    expected: [{ playerName: 'Haaland' }],
  },
];

export const GEMINI_JSON_ARRAY_ERROR_FIXTURES: GeminiJsonArrayErrorFixture[] = [
  {
    name: 'non-json-text',
    rawText: 'No structured output available',
    options: { context: 'Fixture: non-json' },
  },
  {
    name: 'json-object-with-no-array',
    rawText: '{"message":"ok","count":2}',
    options: { context: 'Fixture: object no array', arrayKeys: ['insights', 'signals'] },
  },
  {
    name: 'malformed-json-array',
    rawText: '[{"playerName":"Palmer",}]',
    options: { context: 'Fixture: malformed array' },
  },
];
