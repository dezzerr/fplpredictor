"use client";

import { useState, useMemo, useEffect } from "react";
import { Player, Position } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { weeklyExp } from "@/lib/optimizer";
import { ArrowLeft, Search, ChevronDown, Info, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

const TEAM_NAMES: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton", BUR: "Burnley", CHE: "Chelsea", CRY: "Crystal Palace",
  EVE: "Everton", FUL: "Fulham", LEE: "Leeds", LIV: "Liverpool",
  MCI: "Man City", MUN: "Man Utd", NEW: "Newcastle", NFO: "Nott'm Forest",
  SUN: "Sunderland", TOT: "Spurs", WHU: "West Ham", WOL: "Wolves"
};

const ALL_TEAMS = Object.keys(TEAM_NAMES);
const ALL_POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

interface MobileAddPlayerPageProps {
  initialPosition?: Position;
  onBack: () => void;
  onSelectPlayer: (player: Player) => void;
  weekOffset?: number;
}

type SortField = "form" | "price" | "selected" | "points";

export function MobileAddPlayerPage({ 
  initialPosition, 
  onBack, 
  onSelectPlayer,
  weekOffset = 0 
}: MobileAddPlayerPageProps) {
  const squad = useSquadStore((s) => s.squad);
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const setBank = useSquadStore((s) => s.setBank);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<"unlimited" | number>("unlimited");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>(initialPosition || "all");
  const [sortField, setSortField] = useState<SortField>("form");
  const [sortAsc, setSortAsc] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState(false);
  const [bankInput, setBankInput] = useState("");

  const bank = squad.bank;

  const handleBankEdit = () => {
    setEditingBank(true);
    setBankInput(bank.toFixed(1));
  };

  const handleBankSave = () => {
    const newBank = parseFloat(bankInput);
    if (!isNaN(newBank) && newBank >= 0) {
      setBank(newBank);
    }
    setEditingBank(false);
  };

  // Fetch players from API
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/players")
      .then(res => res.json())
      .then((data: Player[]) => {
        if (active) {
          setAllPlayers(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch players:", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const squadPlayerIds = useMemo(() => {
    const all = [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ];
    return new Set(all.map(p => p.id));
  }, [squad]);

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const all = [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ];
    for (const p of all) {
      counts[p.team] = (counts[p.team] || 0) + 1;
    }
    return counts;
  }, [squad]);

  const filteredPlayers = useMemo(() => {
    let players = allPlayers.filter(p => {
      if (positionFilter !== "all" && p.position !== positionFilter) return false;
      if (squadPlayerIds.has(p.id)) return false;
      if (priceFilter !== "unlimited" && p.price > priceFilter) return false;
      if (teamFilter !== "all" && p.team !== teamFilter) return false;
      if ((teamCounts[p.team] || 0) >= 3) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(query);
        const teamMatch = p.team.toLowerCase().includes(query) || 
                         (TEAM_NAMES[p.team]?.toLowerCase().includes(query));
        if (!nameMatch && !teamMatch) return false;
      }
      return true;
    });

    players.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "form":
          aVal = a.form || 0;
          bVal = b.form || 0;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "selected":
          aVal = a.ownership || 0;
          bVal = b.ownership || 0;
          break;
        case "points":
          aVal = weeklyExp(a, weekOffset);
          bVal = weeklyExp(b, weekOffset);
          break;
        default:
          aVal = a.form || 0;
          bVal = b.form || 0;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return players;
  }, [allPlayers, positionFilter, squadPlayerIds, priceFilter, teamFilter, searchQuery, sortField, sortAsc, teamCounts, weekOffset]);

  const handleSelectPlayer = (player: Player) => {
    if (player.price > bank) {
      toast.error(`Cannot afford ${player.name} (£${player.price.toFixed(1)}m)`);
      return;
    }
    const result = addPlayer(player);
    if (result.ok) {
      toast.success(`Added ${player.name}`);
      onSelectPlayer(player);
    } else {
      toast.error(result.reason || "Failed to add player");
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case "GK": return "Goalkeeper";
      case "DEF": return "Defender";
      case "MID": return "Midfielder";
      case "FWD": return "Forward";
      default: return "Player";
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Add Player</h1>
      </div>

      <div className="mx-4 mt-3">
        {editingBank ? (
          <div className="flex items-center gap-2 bg-emerald-500 rounded-full px-4 py-1.5">
            <span className="text-white font-semibold">Bank £</span>
            <input
              type="number"
              step="0.1"
              value={bankInput}
              onChange={(e) => setBankInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBankSave()}
              onBlur={handleBankSave}
              className="w-20 px-2 py-1 rounded text-center font-semibold text-emerald-700 focus:outline-none"
              autoFocus
            />
            <span className="text-white font-semibold">m</span>
          </div>
        ) : (
          <button
            onClick={handleBankEdit}
            className="w-full bg-emerald-500 text-white py-2.5 rounded-full font-semibold hover:bg-emerald-600 active:bg-emerald-700 flex items-center justify-center gap-2"
          >
            Bank £{bank.toFixed(1)}m
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search By Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 mt-3 flex-wrap">
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Positions</option>
          {ALL_POSITIONS.map(pos => (
            <option key={pos} value={pos}>{getPositionLabel(pos)}</option>
          ))}
        </select>

        <select
          value={priceFilter === "unlimited" ? "unlimited" : String(priceFilter)}
          onChange={(e) => setPriceFilter(e.target.value === "unlimited" ? "unlimited" : parseFloat(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="unlimited">Max Price</option>
          <option value="5">Under £5m</option>
          <option value="6">Under £6m</option>
          <option value="7">Under £7m</option>
          <option value="8">Under £8m</option>
          <option value="10">Under £10m</option>
          <option value="12">Under £12m</option>
          <option value="15">Under £15m</option>
        </select>
        
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Clubs</option>
          {ALL_TEAMS.map(team => (
            <option key={team} value={team}>{TEAM_NAMES[team] || team}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center px-4 mt-4 pb-2 border-b text-xs text-slate-500">
        <div className="flex-1">
          <button onClick={() => toggleSort("form")} className="flex items-center gap-1">
            Player {sortField === "form" && (sortAsc ? "↑" : "↓")}
          </button>
        </div>
        <button 
          onClick={() => toggleSort("form")} 
          className={`w-14 text-center ${sortField === "form" ? "text-purple-600 font-medium" : ""}`}
        >
          Form {sortField === "form" && (sortAsc ? "↑" : "↓")}
        </button>
        <button 
          onClick={() => toggleSort("price")} 
          className={`w-16 text-center ${sortField === "price" ? "text-purple-600 font-medium" : ""}`}
        >
          Price {sortField === "price" && (sortAsc ? "↑" : "↓")}
        </button>
        <button 
          onClick={() => toggleSort("selected")} 
          className={`w-16 text-center ${sortField === "selected" ? "text-purple-600 font-medium" : ""}`}
        >
          Selected {sortField === "selected" && (sortAsc ? "↑" : "↓")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span>Loading players...</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No players match your filters
          </div>
        ) : (
          filteredPlayers.map((player: Player) => {
            const canAfford = player.price <= bank;
            return (
              <div
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 cursor-pointer ${canAfford ? 'hover:bg-slate-50 active:bg-slate-100' : 'opacity-50 bg-slate-50'}`}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); }}
                  className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                </div>
                
                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                  {player.photo ? (
                    <img src={player.photo} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-lg">👕</span>
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm flex items-center gap-1">
                    {player.name}
                    {player.status === "flag" && <span className="text-amber-500">⚠️</span>}
                    {player.status === "out" && <span className="text-red-500">🚫</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {TEAM_NAMES[player.team] || player.team} · {player.position}
                  </div>
                </div>
                
                <div className="w-14 text-center">
                  <span className="text-sm font-medium">{player.form?.toFixed(1) || "0.0"}</span>
                </div>
                
                <div className="w-16 text-center">
                  <span className={`text-sm font-medium ${!canAfford ? 'text-red-500' : ''}`}>£{player.price.toFixed(1)}m</span>
                </div>
                
                <div className="w-16 text-center">
                  <span className="text-sm font-medium">{player.ownership?.toFixed(1) || "0"}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
