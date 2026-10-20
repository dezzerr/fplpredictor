import type { FactPack, FactRecord } from './factPack';

export interface DraftDocument { kind: 'article' | 'email'; pack: FactPack['kind']; title: string; slug: string; content: string; }

const label = (kind: FactPack['kind']) => kind === 'planning' ? 'Planning' : kind === 'availability' ? 'Availability' : 'Deadline';
const claim = (fact: FactRecord) => 'category' in fact ? fact.claim : `${fact.player_name}: ${fact.reason}`;
const source = (fact: FactRecord) => 'category' in fact ? fact.sourceUrl : fact.source_label;

function frontmatter(title: string, slug: string, keyword: string): string {
  return `---\ntitle: "${title}"\nslug: "${slug}"\nseo_title: "${title}"\nmeta_description: "Official FPL ${keyword} facts and decisions for Gameweek."\nprimary_keyword: "${keyword}"\nsecondary_keywords: ["FPL Gameweek", "FPL Companion"]\ndraft_status: "needs-derrick-review"\n---\n`;
}

export function renderArticleDraft(pack: FactPack): DraftDocument {
  const title = `FPL Gameweek ${pack.gameweek} ${label(pack.kind)} Briefing`;
  const slug = `fpl-gameweek-${pack.gameweek}-${pack.kind}-briefing`;
  const facts = pack.facts.slice(0, 12);
  const body = [
    frontmatter(title, slug, `FPL Gameweek ${pack.gameweek} ${pack.kind}`),
    `# ${title}`, '',
    `## Verdict`, '',
    pack.articleReady ? `This ${pack.kind} pack meets the article-ready threshold. Review the evidence before publishing.` : `This is a working draft. It is not article-ready yet. Missing: ${pack.missing.join('; ')}.`, '',
    `## Verified facts`, '',
    ...facts.map((fact) => `- ${claim(fact)} [Source](${source(fact)})`), '',
    `## Manager decisions`, '',
    '- Hold or move based on the confirmed evidence, not a single rumour.',
    '- Compare the flagged player with a same-position option before taking a hit.',
    '- Recheck the official FPL deadline and team news before final decisions.', '',
    `## Sources`, '',
    ...[...new Set(facts.map(source))].map((url) => `- ${url}`), '',
    'Draft only. Derrick review required before external publishing.',
  ].join('\n');
  return { kind: 'article', pack: pack.kind, title, slug, content: body };
}

export function renderEmailDraft(pack: FactPack): DraftDocument {
  const title = `FPL Companion Gameweek ${pack.gameweek} ${label(pack.kind)} Email`;
  const slug = `fpl-gameweek-${pack.gameweek}-${pack.kind}-email`;
  const facts = pack.facts.slice(0, 5);
  const body = [
    `Subject: Gameweek ${pack.gameweek} ${label(pack.kind)} briefing`, '',
    `The ${pack.kind} pack has ${pack.verifiedFacts} verified facts.`, '',
    ...facts.map((fact) => `• ${claim(fact)}`), '',
    'Use the evidence to review your squad. Check the official deadline before making a move.', '',
    'Draft only. Derrick review required before sending.',
  ].join('\n');
  return { kind: 'email', pack: pack.kind, title, slug, content: body };
}

export function buildDraftBundle(packs: FactPack[]): DraftDocument[] {
  return packs.flatMap((pack) => [renderArticleDraft(pack), renderEmailDraft(pack)]);
}
