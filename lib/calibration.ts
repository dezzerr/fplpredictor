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
  CAL: 1.06,
  minutes: { base: 0.8, scale: 0.2 },
  injury: { flaggedLowMin: 0.9, severe: 0.6 },
  posFactor: { GK: 1.02, DEF: 1.06, MID: 1.04, FWD: 1.05 },
  fixtures: { diffScale: 0.3, homeBoost: 1.06 },
  horizonWeights: [0.6, 0.25, 0.15],
};

const CONSERVATIVE: Calibration = {
  name: "Conservative",
  CAL: 1.0,
  minutes: { base: 0.75, scale: 0.2 },
  injury: { flaggedLowMin: 0.85, severe: 0.5 },
  posFactor: { GK: 1.0, DEF: 1.03, MID: 1.02, FWD: 1.03 },
  fixtures: { diffScale: 0.2, homeBoost: 1.03 },
  horizonWeights: [0.55, 0.3, 0.15],
};

const AGGRESSIVE: Calibration = {
  name: "Aggressive",
  CAL: 1.12,
  minutes: { base: 0.85, scale: 0.2 },
  injury: { flaggedLowMin: 0.95, severe: 0.7 },
  posFactor: { GK: 1.04, DEF: 1.08, MID: 1.06, FWD: 1.07 },
  fixtures: { diffScale: 0.4, homeBoost: 1.08 },
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
