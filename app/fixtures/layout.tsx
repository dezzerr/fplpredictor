import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fixture Difficulty — Multi-GW Planning & Analysis",
  description:
    "Visualise Premier League fixture difficulty across 10 gameweeks. Plan FPL transfers around favourable runs, double gameweeks, and team strength differentials.",
};

export default function FixturesLayout({ children }: { children: ReactNode }) {
  return children;
}
