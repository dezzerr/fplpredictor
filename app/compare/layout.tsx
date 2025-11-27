import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Compare Players",
  description: "Compare FPL players side-by-side to make better transfer decisions",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
