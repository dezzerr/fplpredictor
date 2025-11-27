import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "FPL Companion",
    template: "%s | FPL Companion",
  },
  description: "Build & optimize your FPL squad with AI-powered predictions",
  keywords: ["FPL", "Fantasy Premier League", "football", "predictions", "squad builder"],
  authors: [{ name: "FPL Companion" }],
  openGraph: {
    title: "FPL Companion",
    description: "Build & optimize your FPL squad with AI-powered predictions",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-dvh bg-background font-sans antialiased")}> 
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
