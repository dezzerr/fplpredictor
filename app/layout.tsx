import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const shouldEnableGa = process.env.NODE_ENV === "production" && Boolean(gaId);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        {shouldEnableGa && gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
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
