import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fixture Analysis",
  description: "Analyze fixture difficulty and plan transfers around favorable runs",
};

export default function FixturesLayout({ children }: { children: ReactNode }) {
  return children;
}
