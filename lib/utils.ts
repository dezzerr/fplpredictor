import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Primary kit color mapping by team short code
export function teamColor(team: string): string {
  const colors: Record<string, string> = {
    ARS: "#EF0107",
    MCI: "#6CABDD",
    MUN: "#DA291C",
    LIV: "#D00027",
    CHE: "#034694",
    NEW: "#241F20",
    BHA: "#0057B8",
    BRE: "#E30613",
    AVL: "#95BFE5",
    TOT: "#132257",
    WHU: "#7A263A",
    CRY: "#1B458F",
    WOL: "#FDB913",
    FUL: "#000000",
    NFO: "#DD0000",
    LUT: "#FF5F00",
    SHU: "#EE2737",
    EVE: "#003399",
    BOU: "#DA291C",
  };
  return colors[team] || "#9CA3AF"; // default gray
}
