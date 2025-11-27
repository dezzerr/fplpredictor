import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Squad",
  description: "View and manage your FPL squad with AI-powered predictions",
};

export default function SquadLayout({ children }: { children: ReactNode }) {
  return children;
}
