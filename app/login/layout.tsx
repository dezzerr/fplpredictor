import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to FPL Companion to save your squad, sync with the official FPL API, and access AI-powered predictions. Free forever.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
