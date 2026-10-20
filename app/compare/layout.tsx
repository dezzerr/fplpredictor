import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Compare Players — Side-by-Side FPL Analysis",
  description:
    "Compare FPL players head-to-head on predicted points, form, fixtures, ownership, and value. Make smarter transfer decisions with data.",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
