"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSquadStore } from "@/store/squad";

/** How often to poll when GW is live (ms) */
const POLL_INTERVAL = 60_000; // 60 seconds

export interface LiveFixture {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  started: boolean;
  finished: boolean;
  finishedProvisional: boolean;
  minutes: number;
  kickoff: string;
}

export interface LiveLeague {
  id: number;
  name: string;
  rank: number;
  lastRank: number;
  movement: "up" | "down" | "same";
  liveRank: number | null;
  entries: Array<{
    entry: number;
    playerName: string;
    teamName: string;
    rank: number;
    lastRank: number;
    total: number;
    eventTotal: number;
    isManager: boolean;
  }>;
}

export interface LiveGwData {
  /** Whether the current GW is in progress */
  isLive: boolean;
  /** The live event ID */
  eventId: number | null;
  /** Event name e.g. "Gameweek 25" */
  eventName: string | null;
  /** Map of player element ID (string) → live GW points */
  livePoints: Record<string, number>;
  /** Manager's live total points (incl. captain multiplier) */
  managerLivePoints: number | null;
  /** Active chip if any */
  activeChip: string | null;
  /** Live fixture summaries */
  fixtures: LiveFixture[];
  /** Live league standings */
  leagues: LiveLeague[];
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Last fetch timestamp */
  lastUpdated: Date | null;
  /** Force a refresh */
  refresh: () => void;
}

export function useLiveGw(): LiveGwData {
  const [isLive, setIsLive] = useState(false);
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [livePoints, setLivePoints] = useState<Record<string, number>>({});
  const [managerLivePoints, setManagerLivePoints] = useState<number | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<LiveFixture[]>([]);
  const [leagues, setLeagues] = useState<LiveLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastImport = useSquadStore((s) => s.lastImport);
  const entryId = lastImport?.entryId || null;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch live points data
      const url = entryId
        ? `/api/live?entryId=${encodeURIComponent(entryId)}`
        : "/api/live";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch live data");
      const data = await res.json();

      setIsLive(!!data.isLive);
      setEventId(data.eventId ?? null);
      setEventName(data.eventName ?? null);
      setLivePoints(data.livePoints || {});
      setFixtures(data.fixtures || []);
      setActiveChip(data.managerLive?.activeChip ?? null);
      setManagerLivePoints(data.managerLive?.points ?? null);
      setLastUpdated(new Date());

      // If live and has entryId, also fetch league standings
      if (data.isLive && entryId) {
        try {
          const leagueRes = await fetch(
            `/api/live-leagues?entryId=${encodeURIComponent(entryId)}`
          );
          if (leagueRes.ok) {
            const leagueData = await leagueRes.json();
            setLeagues(leagueData.leagues || []);
          }
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.error("[useLiveGw] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchLiveData();

    // Set up polling interval
    intervalRef.current = setInterval(fetchLiveData, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLiveData]);

  // Stop polling when not live (check after each fetch)
  useEffect(() => {
    if (!isLive && intervalRef.current) {
      // Still poll but less frequently when not live (check every 5 min)
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchLiveData, 5 * 60_000);
    } else if (isLive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchLiveData, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, fetchLiveData]);

  return {
    isLive,
    eventId,
    eventName,
    livePoints,
    managerLivePoints,
    activeChip,
    fixtures,
    leagues,
    loading,
    lastUpdated,
    refresh: fetchLiveData,
  };
}
