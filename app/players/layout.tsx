import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Player Database",
  description: "Browse all FPL players with predicted points and statistics",
};

export default function PlayersLayout({ children }: { children: ReactNode }) {
  return children;
}
