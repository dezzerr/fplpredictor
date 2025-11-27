import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Import Squad",
  description: "Import your FPL squad using your team ID",
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return children;
}
