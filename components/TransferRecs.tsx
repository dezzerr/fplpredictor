"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Player, players as mockPlayers } from "@/lib/data";
import type { CalPresetName } from "@/lib/calibration";
import { useSquadStore } from "@/store/squad";
import { recommendTransfers, recommendChips, weeklyExp, totalHorizonPoints, simulatePlannedHorizon, type PlanWeekMap, pickXIForWeek } from "@/lib/optimizer";
import { usePlansStore } from "@/store/plans";

export default function TransferRecs() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<CalPresetName>("Baseline");
  const [showXi, setShowXi] = useState<boolean>(false);

  const squad = useSquadStore((s) => s.squad);
  const removePlayer = useSquadStore((s) => s.removePlayer);
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const plannedWeeks = usePlansStore((s) => s.weeks);

  // Controls
  const [weeks, setWeeks] = useState<number>(3);
  const [freeTransfers, setFreeTransfers] = useState<number>(1);
  const [maxTransfers, setMaxTransfers] = useState<number>(2);
  const [hitCost, setHitCost] = useState<number>(4);
  const [perPosLimit, setPerPosLimit] = useState<number>(20);
  const [onlyPositive, setOnlyPositive] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/players?preset=${encodeURIComponent(preset)}`);
        if (!res.ok) throw new Error("Failed to fetch players");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e: any) {
        console.error("Failed to load live players", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load players");
          setPlayers(mockPlayers);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [preset]);

  const plans = useMemo(() => {
    if (!players.length) return [];
    const res = recommendTransfers({
      squad,
      players,
      weeks,
      allowedFreeTransfers: freeTransfers,
      hitCostPerExtra: hitCost,
      maxTransfersToConsider: maxTransfers,
      perPosCandidateLimit: perPosLimit,
    });
    return onlyPositive ? res.filter(p => p.netGain > 0) : res;
  }, [players, squad, weeks, freeTransfers, hitCost, maxTransfers, perPosLimit, onlyPositive]);

  const chips = useMemo(() => recommendChips(squad, weeks, players), [squad, weeks, players]);
  const baseline = useMemo(() => totalHorizonPoints(squad, weeks), [squad, weeks]);
  const baselinePerWeek = useMemo(() => {
    const arr: number[] = [];
    for (let w = 0; w < weeks; w++) arr.push(pickXIForWeek(squad, w).points);
    return arr;
  }, [squad, weeks]);

  // Build plan map compatible with simulator
  const planMap: PlanWeekMap = useMemo(() => {
    const out: PlanWeekMap = {};
    for (const key of Object.keys(plannedWeeks)) {
      const w = plannedWeeks[+key];
      if (!w) continue;
      out[w.weekOffset] = {
        weekOffset: w.weekOffset,
        transfers: (w.transfers || []).map(t => ({ outId: t.outId, inId: t.inId })),
        chip: w.chip,
        bank: w.bank,
      };
    }
    return out;
  }, [plannedWeeks]);

  const planPreview = useMemo(() => {
    if (!players.length) return null;
    return simulatePlannedHorizon({ squad, players, weeks, plans: planMap });
  }, [players, squad, weeks, planMap]);

  const squadList = useMemo(() => ([
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ]), [squad]);
  const byId = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of squadList) m.set(p.id, p);
    for (const p of players) if (!m.has(p.id)) m.set(p.id, p);
    return m;
  }, [squadList, players]);

  const applyPlan = (idx: number) => {
    const plan = plans[idx];
    if (!plan || plan.transfers.length === 0) return;
    // Apply sequentially: remove then add for each transfer
    for (const t of plan.transfers) {
      removePlayer(t.outId);
      const res = addPlayer(t.inPlayer);
      if (!res.ok) {
        toast.error(`Failed to add ${t.inPlayer.name}: ${res.reason}`);
        return;
      }
    }
    toast.success("Transfers applied. Adjust captain/bench if desired.");
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold">Transfer Recommendations</div>
          <div className="text-xs text-muted-foreground">Maximize expected points over horizon, accounting for hits.</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Baseline {weeks}-GW EV: <span className="font-semibold">{baseline.total.toFixed(1)}</span></div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Horizon (GWs): {weeks}</div>
          <Slider value={[weeks]} onValueChange={(v)=> setWeeks(v[0] ?? 3)} min={1} max={6} step={1} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="w-1/2">
            <div className="text-xs text-muted-foreground">Free transfers</div>
            <Select value={String(freeTransfers)} onValueChange={(v)=> setFreeTransfers(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/2">
            <div className="text-xs text-muted-foreground">Max transfers</div>
            <Select value={String(maxTransfers)} onValueChange={(v)=> setMaxTransfers(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Hit cost/extra</div>
            <Select value={String(hitCost)} onValueChange={(v)=> setHitCost(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">-4</SelectItem>
                <SelectItem value="8">-8</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Per-pos candidates</div>
            <Select value={String(perPosLimit)} onValueChange={(v)=> setPerPosLimit(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Calibration preset</div>
            <Select value={preset} onValueChange={(v)=> setPreset(v as CalPresetName)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Conservative">Conservative</SelectItem>
                <SelectItem value="Baseline">Baseline</SelectItem>
                <SelectItem value="Aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end text-xs text-muted-foreground">
            <div>{loading ? "Loading..." : error ? "Live data error (using fallback)" : `Preset: ${preset}`}</div>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span>Only show net positive</span>
          <Switch checked={onlyPositive} onCheckedChange={setOnlyPositive} />
        </label>
        <div className="text-muted-foreground">{loading ? "Loading..." : error ? "Live data error (using fallback)" : "Live data"}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-2">
          <div className="mb-2 text-sm font-semibold">Best Transfer Plans</div>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {plans.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">No positive plans under current settings.</div>
              ) : (
                plans.map((p, idx) => (
                  <div key={idx} className="rounded border p-2">
                    {p.transfers.length === 0 ? (
                      <div className="text-xs">No transfers • Projected: {p.projected.toFixed(1)} (Δ {p.netGain.toFixed(1)})</div>
                    ) : (
                      <>
                        <div className="text-xs">
                          {p.transfers.map((t,i)=> {
                            const outP = byId.get(t.outId);
                            return (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span>Out: <span className="font-medium">{outP?.name ?? t.outId}</span> {outP ? `(${outP.team} • ${outP.position}) £${outP.price.toFixed(1)}m` : ''}</span>
                                <span>→ In: <span className="font-medium">{t.inPlayer.name}</span> ({t.inPlayer.team} • {t.inPlayer.position}) £{t.inPlayer.price.toFixed(1)}m</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <div>Projected: <span className="font-semibold text-foreground">{p.projected.toFixed(1)}</span> (hit {p.hitCost})</div>
                          <div>Net gain: <span className={p.netGain > 0 ? "text-emerald-600" : p.netGain < 0 ? "text-rose-600" : ""}>{p.netGain.toFixed(1)}</span></div>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Captain picks: {p.weeklyCaptainIds.map((id,i)=> {
                            const cp = byId.get(id);
                            return <span key={i} className="mr-1 inline-block rounded bg-muted px-1 py-[1px]">GW{i+1}:{cp?.name ?? id}</span>;
                          })}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button size="sm" variant="outline" onClick={()=> applyPlan(idx)}>Apply</Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-2">
          <div className="mb-2 text-sm font-semibold">Chip Strategy (EV)</div>
          <div className="space-y-2 text-xs">
            {chips.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded border p-2">
                <div>
                  <div className="font-medium">{c.type} • Suggested GW {c.week + 1}</div>
                  <div className="text-muted-foreground">EV gain: {c.evGain.toFixed(1)}{c.notes ? ` — ${c.notes}` : ""}</div>
                </div>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground">DGW/BGW-aware FH EV uses full player pool; WC optimizer coming soon.</div>
          </div>
        </Card>
      </div>

      <Card className="mt-3 p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">My Plan Preview</div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Baseline: <span className="font-semibold">{baseline.total.toFixed(1)}</span>
              <span className="mx-2">•</span>
              Planned: <span className="font-semibold">{planPreview ? planPreview.total.toFixed(1) : "-"}</span>
              <span className="mx-2">•</span>
              Δ: <span className={(planPreview && planPreview.total - baseline.total > 0) ? "text-emerald-600" : (planPreview && planPreview.total - baseline.total < 0) ? "text-rose-600" : ""}>
                {planPreview ? (planPreview.total - baseline.total).toFixed(1) : "-"}
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Show XI</span>
              <Switch checked={showXi} onCheckedChange={setShowXi} />
            </label>
          </div>
        </div>
        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2 text-xs">
            {planPreview ? planPreview.perWeek.map((w) => {
              const base = baselinePerWeek[w.week] ?? 0;
              const delta = (w.points - base).toFixed(1);
              const deltaCls = Number(delta) > 0 ? "text-emerald-600" : Number(delta) < 0 ? "text-rose-600" : "";
              return (
                <div key={w.week} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">GW {w.week + 1} {w.chip ? <span className="ml-1 inline-block rounded bg-muted px-1 py-[1px] text-[10px]">{w.chip}</span> : null}</div>
                      <div className="text-muted-foreground">Planned: {w.points.toFixed(1)} • Baseline: {base.toFixed(1)} • Δ: <span className={deltaCls}>{delta}</span></div>
                    </div>
                    <div className="text-muted-foreground">
                      Captain: <span className="font-medium">{byId.get(w.capId)?.name ?? w.capId}</span>
                    </div>
                  </div>
                  {showXi && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.xiIds.map((id) => (
                        <span key={id} className="inline-block rounded bg-muted px-1.5 py-[2px] text-[10px]">
                          {byId.get(id)?.name ?? id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="p-2 text-muted-foreground">No plan yet. Use the Plan Editor on this page to add transfers/chips.</div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </Card>
  );
}
