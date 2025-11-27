import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  TEAM_COLORS,
  DEFAULT_TEAM_COLOR,
  PLAYER_NICKNAMES,
  FIRST_NAME_PREFERRED,
  COMMON_LAST_NAMES,
} from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Get the primary kit color for a team by short code */
export function teamColor(team: string): string {
  return TEAM_COLORS[team] || DEFAULT_TEAM_COLOR;
}

/** Convert full player names to FPL-style display names (first names/nicknames) */
export function getFPLDisplayName(fullName: string): string {
  // Check if we have a specific nickname mapping
  if (PLAYER_NICKNAMES[fullName]) {
    return PLAYER_NICKNAMES[fullName];
  }

  // For names not in our mapping, extract the display name
  const parts = fullName.split(" ");

  // If single name, return as is
  if (parts.length === 1) {
    return parts[0];
  }

  // For two-part names, usually return the last name
  if (parts.length === 2) {
    // Exception for common first name preferences
    if (FIRST_NAME_PREFERRED.includes(parts[0] as typeof FIRST_NAME_PREFERRED[number])) {
      return parts[0];
    }
    return parts[1];
  }

  // For longer names, return the last name unless it's very common
  const lastName = parts[parts.length - 1];

  if (COMMON_LAST_NAMES.includes(lastName as typeof COMMON_LAST_NAMES[number]) && parts.length > 2) {
    // Return first name + initial of last name
    return `${parts[0]} ${lastName[0]}.`;
  }

  return lastName;
}
