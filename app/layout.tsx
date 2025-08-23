import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "FPL Copilot",
  description: "Build & optimize your FPL squad",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-dvh bg-background font-sans antialiased")}> 
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
