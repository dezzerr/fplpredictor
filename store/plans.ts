"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Chip = "FH" | "BB" | "TC" | "WC";

export type PlannedTransfer = {
  // Optional because some users may plan a one-sided move (e.g., sell only before WC)
  outId?: string;
  inId?: string;
  note?: string;
};

export type PlanWeek = {
  // Week offset relative to "next" GW (0 = next GW)
  weekOffset: number;
  transfers: PlannedTransfer[];
  // Optional: planned chip for this GW
  chip?: Chip;
  // Optional: manual planned bank after this GW (if user wants to override derived)
  bank?: number;
  // Optional note for the week
  note?: string;
};

export type PlansState = {
  // Map of weekOffset -> PlanWeek
  weeks: Record<number, PlanWeek>;

  // CRUD helpers
  getWeek: (weekOffset: number) => PlanWeek;
  setWeekMeta: (weekOffset: number, meta: Partial<Pick<PlanWeek, "chip" | "bank" | "note">>) => void;
  addTransfer: (weekOffset: number, t: PlannedTransfer) => void;
  updateTransfer: (weekOffset: number, index: number, t: Partial<PlannedTransfer>) => void;
  removeTransfer: (weekOffset: number, index: number) => void;
  clearWeek: (weekOffset: number) => void;
  clearAll: () => void;

  // Serialization helpers (useful for copy/paste or future import/export UI)
  serialize: () => string;
  load: (json: string) => { ok: boolean; reason?: string };
};

export const usePlansStore = create<PlansState>()(
  persist(
    (set, get) => ({
      weeks: {},

      getWeek: (weekOffset) => {
        const w = get().weeks[weekOffset];
        if (w) return w;
        const nw: PlanWeek = { weekOffset, transfers: [] };
        set((state) => ({ weeks: { ...state.weeks, [weekOffset]: nw } }));
        return nw;
      },

      setWeekMeta: (weekOffset, meta) =>
        set((state) => ({
          weeks: {
            ...state.weeks,
            [weekOffset]: { ...(state.weeks[weekOffset] ?? { weekOffset, transfers: [] }), ...meta },
          },
        })),

      addTransfer: (weekOffset, t) =>
        set((state) => {
          const cur = state.weeks[weekOffset] ?? { weekOffset, transfers: [] };
          return { weeks: { ...state.weeks, [weekOffset]: { ...cur, transfers: [...cur.transfers, t] } } };
        }),

      updateTransfer: (weekOffset, index, t) =>
        set((state) => {
          const cur = state.weeks[weekOffset];
          if (!cur) return { weeks: state.weeks };
          const transfers = cur.transfers.map((x, i) => (i === index ? { ...x, ...t } : x));
          return { weeks: { ...state.weeks, [weekOffset]: { ...cur, transfers } } };
        }),

      removeTransfer: (weekOffset, index) =>
        set((state) => {
          const cur = state.weeks[weekOffset];
          if (!cur) return { weeks: state.weeks };
          const transfers = cur.transfers.filter((_, i) => i !== index);
          return { weeks: { ...state.weeks, [weekOffset]: { ...cur, transfers } } };
        }),

      clearWeek: (weekOffset) =>
        set((state) => {
          const n = { ...state.weeks };
          delete n[weekOffset];
          return { weeks: n };
        }),

      clearAll: () => set({ weeks: {} }),

      serialize: () => {
        const { weeks } = get();
        try {
          return JSON.stringify({ weeks });
        } catch {
          return "{}";
        }
      },

      load: (json: string) => {
        try {
          const parsed = JSON.parse(json);
          const weeks = parsed?.weeks as Record<number, PlanWeek> | undefined;
          if (!weeks || typeof weeks !== "object") return { ok: false, reason: "Invalid plan format" };
          set({ weeks });
          return { ok: true };
        } catch (e: any) {
          return { ok: false, reason: e?.message ?? "Failed to parse" };
        }
      },
    }),
    { name: "fpl-copilot-plans-v1" }
  )
);
