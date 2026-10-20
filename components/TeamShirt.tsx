"use client";

import { teamColor } from "@/lib/utils";

interface TeamShirtProps {
  team: string;
  className?: string;
}

export function TeamShirt({ team, className = "" }: TeamShirtProps) {
  const primaryColor = teamColor(team);
  
  // Get a complementary color for the shirt accent
  const getSecondaryColor = (primary: string) => {
    // Simple color mapping for common teams
    const colorMap: Record<string, string> = {
      "#FF0000": "#FFFFFF", // Red -> White
      "#0000FF": "#FFFFFF", // Blue -> White
      "#00FF00": "#FFFFFF", // Green -> White
      "#FFFF00": "#000000", // Yellow -> Black
      "#FFA500": "#000000", // Orange -> Black
      "#800080": "#FFFFFF", // Purple -> White
      "#000000": "#FFFFFF", // Black -> White
      "#FFFFFF": "#000000", // White -> Black
    };
    return colorMap[primary] || "#FFFFFF";
  };

  const secondaryColor = getSecondaryColor(primaryColor);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Shirt body */}
        <path
          d="M8 6C8 6 8 4 12 4C16 4 16 6 16 6L18 8V20H6V8L8 6Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="0.5"
        />
        {/* Shirt sleeves */}
        <path
          d="M6 8L4 10V14L6 12V8Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="0.5"
        />
        <path
          d="M18 8L20 10V14L18 12V8Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="0.5"
        />
        {/* Shirt collar */}
        <path
          d="M10 6C10 5.5 11 4.5 12 4.5C13 4.5 14 5.5 14 6V7H10V6Z"
          fill={secondaryColor}
          stroke={primaryColor}
          strokeWidth="0.3"
        />
      </svg>
    </div>
  );
}
