import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free FPL Team Rating & Transfer Recommendations | FPL Companion",
  description: "Get your Fantasy Premier League team rated for free. Receive personalized transfer suggestions and improve your FPL rank with our advanced team analysis.",
  keywords: ["FPL", "Fantasy Premier League", "team rating", "transfer recommendations", "FPL tips", "fantasy football"],
  openGraph: {
    title: "Free FPL Team Rating & Transfer Recommendations",
    description: "Get your Fantasy Premier League team rated for free. Receive personalized transfer suggestions to improve your FPL rank.",
    type: "website",
  },
};

export default function AiTeamRatingLayout({ children }: { children: ReactNode }) {
  return children;
}
