import { cn } from "@/lib/utils";

export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
