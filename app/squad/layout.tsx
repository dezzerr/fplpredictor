import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Squad — AI Points Predictions & Best XI",
  description:
    "View your FPL squad with AI-powered predicted points, optimal XI selection, captain picks, and live gameweek tracking. Updated every gameweek.",
};

export default function SquadLayout({ children }: { children: ReactNode }) {
  return children;
}
