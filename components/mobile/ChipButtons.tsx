"use client";

import { cn } from "@/lib/utils";

interface Chip {
  id: string;
  name: string;
  icon: React.ReactNode | ((props: { active?: boolean }) => React.ReactNode);
  active?: boolean;
  disabled?: boolean;
}

interface ChipButtonsProps {
  chips: Chip[];
  onChipClick?: (chipId: string) => void;
  variant?: "pick-team" | "transfers";
}

// SVG icons matching FPL app style - purple/violet color scheme
const BenchBoostIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={active ? "#7c3aed" : "#6b7280"} strokeWidth="2">
    <rect x="4" y="14" width="16" height="5" rx="1" />
    <path d="M7 14V11a2 2 0 012-2h6a2 2 0 012 2v3" />
    <circle cx="12" cy="6" r="2" />
  </svg>
);

const TripleCaptainIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={active ? "#7c3aed" : "#6b7280"} strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill={active ? "#7c3aed" : "#6b7280"} stroke="none">3×</text>
  </svg>
);

const WildcardIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={active ? "#7c3aed" : "#6b7280"} strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 12h6M12 9v6" />
  </svg>
);

const FreeHitIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={active ? "#7c3aed" : "#6b7280"} strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1.5" fill={active ? "#7c3aed" : "#6b7280"} />
  </svg>
);

export const CHIP_ICONS: Record<string, (props: { active?: boolean }) => React.ReactNode> = {
  "bench-boost": (props) => <BenchBoostIcon {...props} />,
  "triple-captain": (props) => <TripleCaptainIcon {...props} />,
  "wildcard": (props) => <WildcardIcon {...props} />,
  "free-hit": (props) => <FreeHitIcon {...props} />,
};

export function ChipButtons({ chips, onChipClick, variant = "pick-team" }: ChipButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-3">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChipClick?.(chip.id)}
          disabled={chip.disabled}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all min-w-[76px]",
            chip.active
              ? "border-violet-400 bg-violet-50 shadow-sm"
              : "border-gray-200 bg-white hover:border-violet-300",
            chip.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Icon circle */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            chip.active ? "bg-violet-100" : "bg-slate-100"
          )}>
            {typeof chip.icon === 'function' ? (chip.icon as any)({ active: chip.active }) : chip.icon}
          </div>
          {/* Chip name */}
          <span className={cn(
            "text-[10px] font-semibold leading-tight text-center",
            chip.active ? "text-violet-700" : "text-gray-600"
          )}>
            {chip.name}
          </span>
          {/* Play button */}
          <span className={cn(
            "text-[9px] font-bold px-3 py-0.5 rounded-sm",
            chip.active 
              ? "bg-violet-600 text-white" 
              : "bg-slate-200 text-slate-600"
          )}>
            Play
          </span>
        </button>
      ))}
    </div>
  );
}

// Default chip configurations
export const PICK_TEAM_CHIPS: Chip[] = [
  { id: "bench-boost", name: "Bench Boost", icon: CHIP_ICONS["bench-boost"] },
  { id: "triple-captain", name: "Triple Captain", icon: CHIP_ICONS["triple-captain"] },
  { id: "wildcard", name: "Wildcard", icon: CHIP_ICONS["wildcard"] },
  { id: "free-hit", name: "Free Hit", icon: CHIP_ICONS["free-hit"] },
];

export const TRANSFER_CHIPS: Chip[] = [
  { id: "wildcard", name: "Wildcard", icon: CHIP_ICONS["wildcard"] },
  { id: "free-hit", name: "Free Hit", icon: CHIP_ICONS["free-hit"] },
];
