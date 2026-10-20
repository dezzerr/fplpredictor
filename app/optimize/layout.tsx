import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Squad Optimizer — Best Transfers & Team Selection",
  description:
    "Auto-select your best FPL XI, discover market-leading differentials, and plan optimal transfers across multiple gameweeks.",
};

export default function OptimizeLayout({ children }: { children: ReactNode }) {
  return children;
}
