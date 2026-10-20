import type { ScrapedContent } from './scrapers';
import type { PreparedSignalRow } from './signalRows';
import type { OfficialPlanningFact } from './officialFpl';

export type FactPackKind = 'planning' | 'availability' | 'deadline';
export type FactRecord = PreparedSignalRow | OfficialPlanningFact;

export interface FactPack {
  kind: FactPackKind;
  gameweek: number;
  sourceItems: number;
  sourceLabels: string[];
  verifiedFacts: number;
  facts: FactRecord[];
  articleReady: boolean;
  emailReady: boolean;
  missing: string[];
  generatedAt: string;
  deadline?: string | null;
}

const MINIMUM_FACTS = 5;
const MINIMUM_ACTIONABLE_FACTS = 3;

function kindForSignal(signal: string): FactPackKind[] {
  if (['injured', 'returning', 'suspended', 'minutes_risk'].includes(signal)) return ['availability', 'deadline'];
  if (['starts', 'benched', 'rotation_risk'].includes(signal)) return ['availability', 'deadline'];
  if (['hot_form', 'cold_form', 'set_piece_change', 'role_change', 'penalty_change'].includes(signal)) return ['planning', 'deadline'];
  return ['planning', 'availability', 'deadline'];
}

function kindForOfficialFact(fact: OfficialPlanningFact): FactPackKind[] {
  if (fact.category === 'deadline') return ['deadline'];
  if (fact.category === 'fixture' || fact.category === 'player-form' || fact.category === 'team-form' || fact.category === 'price' || fact.category === 'ownership' || fact.category === 'captaincy') return ['planning', 'deadline'];
  return ['planning'];
}

export function buildFactPacks(
  gameweek: number,
  content: ScrapedContent[],
  facts: PreparedSignalRow[],
  officialFacts: OfficialPlanningFact[] = [],
  deadline: string | null = null,
): FactPack[] {
  const sourceLabels = [...new Set(content.map((item) => item.source))];
  const sourceItems = content.length;
  const allFacts: FactRecord[] = [...facts, ...officialFacts];
  return (['planning', 'availability', 'deadline'] as FactPackKind[]).map((kind) => {
    const packFacts = allFacts.filter((fact) => 'category' in fact ? kindForOfficialFact(fact).includes(kind) : kindForSignal(fact.signal).includes(kind));
    const missing: string[] = [];
    if (packFacts.length < MINIMUM_FACTS) missing.push(`at least ${MINIMUM_FACTS} verified facts`);
    if (packFacts.length < MINIMUM_ACTIONABLE_FACTS) missing.push(`at least ${MINIMUM_ACTIONABLE_FACTS} actionable facts`);
    return {
      kind, gameweek, sourceItems, sourceLabels, verifiedFacts: packFacts.length, facts: packFacts,
      articleReady: missing.length === 0, emailReady: packFacts.length >= MINIMUM_ACTIONABLE_FACTS,
      missing, generatedAt: new Date().toISOString(), deadline,
    };
  });
}
