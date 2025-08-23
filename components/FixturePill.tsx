import { Fixture } from "@/lib/data";
import { cn } from "@/lib/utils";

function diffColor(diff: number) {
  // 1 easiest -> green, 5 hardest -> red
  switch (diff) {
    case 1: return "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100";
    case 2: return "bg-emerald-400/20 text-emerald-900 dark:text-emerald-100";
    case 3: return "bg-zinc-400/20 text-zinc-900 dark:text-zinc-100";
    case 4: return "bg-amber-500/20 text-amber-900 dark:text-amber-100";
    case 5: return "bg-red-500/20 text-red-900 dark:text-red-100";
    default: return "bg-muted";
  }
}

export function FixturePill({ f, className }: { f: Fixture; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        diffColor(f.diff),
        className
      )}
      aria-label={`Fixture ${f.H ? 'Home' : 'Away'} vs ${f.opp}, difficulty ${f.diff}`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", f.H ? "bg-emerald-500" : "bg-sky-500")} />
      <span>{f.opp}</span>
    </span>
  );
}
