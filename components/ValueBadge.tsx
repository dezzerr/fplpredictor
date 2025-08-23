export function ValueBadge({ price }: { price: number }) {
  return (
    <span className="rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
      £{price.toFixed(1)}m
    </span>
  );
}
