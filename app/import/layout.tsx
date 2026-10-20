import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Import FPL Squad — Sync Your Team in Seconds",
  description:
    "Enter your FPL Team ID to instantly import your squad with latest prices, ownership data, and AI-predicted points. One-click setup.",
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return children;
}
