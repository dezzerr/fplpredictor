"use client";

import { createContext, useContext } from "react";
import { useLiveGw, type LiveGwData } from "@/hooks/useLiveGw";

const LiveGwContext = createContext<LiveGwData>({
  isLive: false,
  eventId: null,
  eventName: null,
  livePoints: {},
  managerLivePoints: null,
  activeChip: null,
  fixtures: [],
  leagues: [],
  loading: false,
  lastUpdated: null,
  refresh: () => {},
});

export function LiveGwProvider({ children }: { children: React.ReactNode }) {
  const liveData = useLiveGw();
  return (
    <LiveGwContext.Provider value={liveData}>{children}</LiveGwContext.Provider>
  );
}

export function useLiveGwContext(): LiveGwData {
  return useContext(LiveGwContext);
}
