import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Optimize Squad",
  description: "Optimize your FPL squad and discover market-leading players",
};

export default function OptimizeLayout({ children }: { children: ReactNode }) {
  return children;
}
