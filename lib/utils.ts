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

// Convert full player names to FPL-style display names (first names/nicknames)
export function getFPLDisplayName(fullName: string): string {
  // Common FPL nickname mappings
  const nicknames: Record<string, string> = {
    "Mohamed Salah": "Salah",
    "Erling Haaland": "Haaland",
    "Kevin De Bruyne": "De Bruyne",
    "Bruno Fernandes": "Bruno F.",
    "Virgil van Dijk": "Van Dijk",
    "Son Heung-min": "Son",
    "Bukayo Saka": "Saka",
    "Martin Ødegaard": "Ødegaard",
    "Marcus Rashford": "Rashford",
    "Harry Kane": "Kane",
    "Alexander Isak": "Isak",
    "Darwin Núñez": "Darwin",
    "Gabriel Jesus": "Jesus",
    "Kai Havertz": "Havertz",
    "Raheem Sterling": "Sterling",
    "Jack Grealish": "Grealish",
    "Phil Foden": "Foden",
    "Mason Mount": "Mount",
    "Declan Rice": "Rice",
    "Casemiro": "Casemiro",
    "N'Golo Kanté": "Kanté",
    "Thiago Silva": "T. Silva",
    "Ruben Dias": "Dias",
    "João Cancelo": "Cancelo",
    "Kyle Walker": "Walker",
    "Andrew Robertson": "Robertson",
    "Trent Alexander-Arnold": "Trent",
    "Aaron Wan-Bissaka": "Wan-Bissaka",
    "Luke Shaw": "Shaw",
    "Reece James": "James",
    "Ben Chilwell": "Chilwell",
    "Alisson Becker": "Alisson",
    "Ederson Moraes": "Ederson",
    "Hugo Lloris": "Lloris",
    "Jordan Pickford": "Pickford",
    "Nick Pope": "Pope",
    "Aaron Ramsdale": "Ramsdale"
  };

  // Check if we have a specific nickname mapping
  if (nicknames[fullName]) {
    return nicknames[fullName];
  }

  // For names not in our mapping, extract the display name
  const parts = fullName.split(' ');
  
  // If single name, return as is
  if (parts.length === 1) {
    return parts[0];
  }
  
  // For two-part names, usually return the last name
  if (parts.length === 2) {
    // Exception for common first name preferences
    const firstNamePreferred = ['Bruno', 'Casemiro', 'Fabinho', 'Alisson', 'Ederson', 'Fred', 'Gabriel', 'Jesus', 'Darwin'];
    if (firstNamePreferred.includes(parts[0])) {
      return parts[0];
    }
    return parts[1];
  }
  
  // For longer names, return the last name unless it's very common
  const lastName = parts[parts.length - 1];
  const commonLastNames = ['Silva', 'Santos', 'Fernandes', 'Rodriguez'];
  
  if (commonLastNames.includes(lastName) && parts.length > 2) {
    // Return first name + initial of last name
    return `${parts[0]} ${lastName[0]}.`;
  }
  
  return lastName;
}
