"use client";

import { cn } from "@/lib/utils";

interface TransferStatsProps {
  freeTransfers: number;
  cost: number;
  budget: number;
}

export function TransferStats({ freeTransfers, cost, budget }: TransferStatsProps) {
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3">
      {/* Free Transfers */}
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{freeTransfers}</div>
        <div className="text-[10px] text-gray-500 leading-tight">
          Free<br />Transfers
        </div>
      </div>

      {/* Cost */}
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{cost} pts</div>
        <div className="text-[10px] text-gray-500">Cost</div>
      </div>

      {/* Budget */}
      <div className="text-center">
        <div className={cn(
          "px-3 py-1 rounded text-lg font-bold",
          budget >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          £{budget.toFixed(1)}m
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">Budget</div>
      </div>
    </div>
  );
}
