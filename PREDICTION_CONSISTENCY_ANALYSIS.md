# Prediction Consistency Analysis

## ✅ Summary
All prediction calculations throughout the app are properly connected and using the updated conservative calibration model.

## Core Prediction Flow

### 1. **Source: `/lib/fpl.ts`** (fetchFplPlayers)
This is the **single source of truth** for player predictions.

**Current Configuration:**
- **Baseline CAL**: 1.5 (reduced from original 2.2)
- **Conservative CAL**: 1.3
- **Aggressive CAL**: 1.7
- **Position Caps**: GK: 7.0, DEF: 10.0, MID: 12.0, FWD: 14.0
- **Form Factor Cap**: 0.80 - 1.25x (prevents runaway multipliers)
- **Team Strength Impact**: ±5% per strength point (max ±12.5%)

**Output:**
- Each player gets `expPoints` calculated with all factors applied
- `expExplain` object contains breakdown of all factors
- These values are used by ALL other parts of the app

---

## 2. **Market Enhancement: `/lib/market.ts`**
**Status:** ✅ Properly preserves FPL predictions

- Falls back to FPL data when odds unavailable
- Preserves all calibration factors (formFactor, penaltyBoost, minutesFactor, etc.)
- When odds available, calculates per-event predictions but maintains consistency

---

## 3. **Optimizer: `/lib/optimizer.ts`**
**Status:** ✅ Uses weeklyExp() correctly

- `weeklyExp()` function respects player's `expPoints` and `expExplain`
- For week 0: directly uses `p.expPoints`
- For future weeks: applies fixture factors relative to week 0
- Accounts for DGW/blanks using `eventFactors` and `eventFixtureCounts`

**Key Functions:**
- `pickXIForWeek()` - Uses weeklyExp for lineup selection
- `pickBestXIFromPool()` - Uses weeklyExp for optimal team selection
- All transfer/planning logic uses weeklyExp

---

## 4. **Squad Store: `/store/squad.ts`**
**Status:** ✅ All calculations aligned

### Total Points Calculations
```typescript
totalExpPoints() // Uses p.expPoints directly
startersExpForWeek(offset) // Uses weeklyExp(p, offset)
totalExpForWeek(offset) // Uses weeklyExp with captain doubling
```

### Rating Calculations (UPDATED)
```typescript
teamRating() {
  const perSlot = totalExpPoints() / 11;
  // 6.5pts per slot = 100% (essentially impossible)
  return min(100, (perSlot / 6.5) * 100);
}

gwRating() {
  const avgExpPerStarter = totalExp / starters.length;
  // 6.0pts per starter = 100% (essentially impossible)
  return min(100, (avgExpPerStarter / 6.0) * 100);
}
```

**Impact:**
- Elite teams will show 75-85%
- Good teams will show 60-75%
- 100% rating is virtually impossible

---

## 5. **API Routes**
**Status:** ✅ All routes use correct data source

- `/api/players` → Uses `fetchPlayersWithMarket(preset)`
- `/api/squad` → Uses `fetchPlayersWithMarket(preset)`
- All APIs respect the `preset` query parameter (baseline/conservative/aggressive)

---

## 6. **UI Components**
**Status:** ✅ Display values correctly

### HeaderKpis.tsx
- Displays `teamRating()` and `gwRating()` from store
- Shows predicted points from weeklyExp calculations

### PlayerTile.tsx
- Uses `weeklyExp(player, weekOffset)` for display
- Shows fixture count indicators for DGW/blanks

### PlayerFinder.tsx
- Displays `p.expPoints` directly from player data
- All filtering/sorting uses same values

---

## Verification Checklist

✅ **Single Source of Truth**: All predictions originate from `/lib/fpl.ts`
✅ **Calibration Applied**: CAL factor reduced to 1.5 baseline
✅ **Position Caps**: Impossible to exceed realistic max points
✅ **Form Caps**: Combined form factor limited to 1.25x max
✅ **Team Strength**: Conservative ±5% per strength point
✅ **Rating Scales**: 100% virtually impossible (6.5 pts/slot, 6.0 pts/starter)
✅ **Optimizer Aligned**: Uses weeklyExp consistently
✅ **Store Aligned**: All calculations use correct sources
✅ **APIs Aligned**: Respect preset parameter
✅ **UI Aligned**: Display values from correct sources

---

## Expected Behavior

### Typical Predictions (Baseline)
- **Elite attackers vs weak teams**: 6-8 points
- **Mid-tier players vs average teams**: 3-5 points
- **Goalkeepers (any)**: Max 7 points
- **Defenders**: 4-7 points typically
- **Squad total**: 50-70 points per GW

### Rating Percentages
- **Exceptional team**: 75-85%
- **Good team**: 60-75%
- **Average team**: 45-60%
- **Weak team**: 30-45%
- **100% rating**: Requires 71.5 total points (unrealistic)

### GW Rating
- **Great fixtures**: 70-85%
- **Good fixtures**: 55-70%
- **Average fixtures**: 40-55%
- **100% rating**: Requires every starter averaging 6+ points (unrealistic)

---

## Consistency Summary

The entire codebase follows a single, consistent prediction pipeline:

1. **FPL API Data** → `/lib/fpl.ts` (with calibration)
2. **Player Objects** with `expPoints` + `expExplain`
3. **Optimizer** uses `weeklyExp()` for week-specific predictions
4. **Squad Store** aggregates and calculates ratings
5. **UI Components** display these values

**No component calculates predictions independently** - all use the centralized data.

---

## Files Modified Today

1. `/lib/fpl.ts` - Enhanced form factors, team strength, position caps
2. `/lib/calibration.ts` - Reduced CAL factors across all presets
3. `/store/squad.ts` - Updated rating scales to prevent 100%

All changes work together to create **realistic, conservative predictions** where 100% ratings are essentially impossible.
