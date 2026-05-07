import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Player Database — FPL Stats, Predictions & Form",
  description:
    "Browse every Premier League player with AI-predicted points, form analysis, fixture difficulty ratings, and ownership stats. Find your next FPL transfer.",
};

export default function PlayersLayout({ children }: { children: ReactNode }) {
  return children;
}
