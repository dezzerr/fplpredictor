"use client";

import { create } from "zustand";
import type { Position } from "@/lib/data";

export type FiltersState = {
  search: string;
  price: [number, number];
  auto: boolean;
  position: Position | "ALL";
  sort: "PRICE" | "EXP_POINTS" | "FIXTURE_EASE";
  setSearch: (v: string) => void;
  setPrice: (v: [number, number]) => void;
  setAuto: (v: boolean) => void;
  setPosition: (v: Position | "ALL") => void;
  setSort: (v: "PRICE" | "EXP_POINTS" | "FIXTURE_EASE") => void;
};

export const MIN_PRICE = 4.0;
export const MAX_PRICE = 14.5;

export const useFilters = create<FiltersState>((set) => ({
  search: "",
  price: [MIN_PRICE, MAX_PRICE],
  auto: true,
  position: "ALL",
  sort: "EXP_POINTS",
  setSearch: (v) => set({ search: v }),
  setPrice: (v) => set({ price: v }),
  setAuto: (v) => set({ auto: v }),
  setPosition: (v) => set({ position: v }),
  setSort: (v) => set({ sort: v }),
}));
