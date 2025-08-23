export function FormationBadge({ counts }: { counts: { GK: number; DEF: number; MID: number; FWD: number } }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground" aria-label="Formation">
      {counts.DEF}-{counts.MID}-{counts.FWD}
    </span>
  );
}
