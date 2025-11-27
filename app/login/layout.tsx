import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to FPL Companion to save and sync your squad",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
