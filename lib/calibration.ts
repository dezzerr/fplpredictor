export type CalPresetName = "Baseline" | "Conservative" | "Aggressive";

export type Calibration = {
  name: CalPresetName;
  CAL: number; // global scale
  minutes: { base: number; scale: number }; // minutesFactor = base + scale * minutesProb
  injury: { flaggedLowMin: number; severe: number }; // multipliers
  posFactor: Record<"GK" | "DEF" | "MID" | "FWD", number>;
  fixtures: { diffScale: number; homeBoost: number }; // factor = (1 + diffScale*(3-d)/3) * (H?homeBoost:1/homeBoost')
  horizonWeights: number[]; // for 3-GW blend in explain only
};

const BASELINE: Calibration = {
  name: "Baseline",
  CAL: 1.5, // Further reduced from 1.9 to prevent over-prediction
  minutes: { base: 0.8, scale: 0.2 },
  injury: { flaggedLowMin: 0.9, severe: 0.6 },
  posFactor: { GK: 1.0, DEF: 1.02, MID: 1.01, FWD: 1.02 }, // More conservative position factors
  fixtures: { diffScale: 0.2, homeBoost: 1.04 }, // Further reduced fixture impact
  horizonWeights: [0.6, 0.25, 0.15],
};

const CONSERVATIVE: Calibration = {
  name: "Conservative",
  CAL: 1.3, // Very conservative
  minutes: { base: 0.75, scale: 0.2 },
  injury: { flaggedLowMin: 0.85, severe: 0.5 },
  posFactor: { GK: 1.0, DEF: 1.01, MID: 1.0, FWD: 1.01 },
  fixtures: { diffScale: 0.15, homeBoost: 1.03 },
  horizonWeights: [0.55, 0.3, 0.15],
};

const AGGRESSIVE: Calibration = {
  name: "Aggressive",
  CAL: 1.7, // Reduced from 2.1 to be more realistic
  minutes: { base: 0.85, scale: 0.2 },
  injury: { flaggedLowMin: 0.95, severe: 0.7 },
  posFactor: { GK: 1.01, DEF: 1.03, MID: 1.02, FWD: 1.03 },
  fixtures: { diffScale: 0.25, homeBoost: 1.05 },
  horizonWeights: [0.65, 0.25, 0.1],
};

export const PRESETS: Record<CalPresetName, Calibration> = {
  Baseline: BASELINE,
  Conservative: CONSERVATIVE,
  Aggressive: AGGRESSIVE,
};

export function getCalibration(name?: CalPresetName | string | null): Calibration {
  if (typeof name === "string") {
    // Accept exact capitalized names
    if (name === "Baseline" || name === "Conservative" || name === "Aggressive") {
      return PRESETS[name as CalPresetName];
    }
    // Be tolerant to casing/synonyms from UI/query params
    const key = name.trim().toLowerCase();
    if (key === "baseline") return PRESETS.Baseline;
    if (key === "conservative") return PRESETS.Conservative;
    if (key === "aggressive") return PRESETS.Aggressive;
  }
  return PRESETS.Baseline;
}
