import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  metadataBase: new URL("https://fplcompanion.co.uk"),
  title: {
    default: "FPL Companion — AI-Powered Fantasy Premier League Points Predictor",
    template: "%s | FPL Companion",
  },
  description:
    "Beat your mini-league with AI-powered FPL points predictions, smart squad optimisation, fixture analysis, and live gameweek tracking. Free forever.",
  keywords: [
    "FPL",
    "Fantasy Premier League",
    "FPL predictions",
    "FPL points predictor",
    "FPL squad builder",
    "FPL optimizer",
    "FPL fixture difficulty",
    "FPL captain picks",
    "FPL transfer planner",
    "FPL AI",
    "FPL companion",
    "fantasy football",
  ],
  authors: [{ name: "FPL Companion" }],
  creator: "FPL Companion",
  publisher: "FPL Companion",
  alternates: {
    canonical: "https://fplcompanion.co.uk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "FPL Companion — AI-Powered Fantasy Premier League Points Predictor",
    description:
      "Beat your mini-league with AI-powered FPL points predictions, smart squad optimisation, fixture analysis, and live gameweek tracking.",
    url: "https://fplcompanion.co.uk",
    siteName: "FPL Companion",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FPL Companion — AI-Powered FPL Points Predictor",
    description:
      "Beat your mini-league with AI-powered predictions, squad optimisation, and live gameweek tracking. Free forever.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
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
