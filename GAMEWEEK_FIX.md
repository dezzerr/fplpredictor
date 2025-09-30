# Gameweek & Import Fixes

## Issues Fixed (December 30, 2025)

### 1. **Fixture Gameweek Numbers Now Show Correctly** ✅
**Problem**: Fixtures showed hardcoded "GW3, GW4, GW5" instead of actual gameweeks from FPL API

**Solution**:
- Extended `Fixture` type to include `event?: number` (actual GW number)
- Updated `fetchFplPlayers()` in `lib/fpl.ts` to capture event numbers from fixtures
- Updated PlayerFinder modal to display actual GW numbers when available
- Falls back to relative notation (GW+1, GW+2) if event number unavailable

**Files Modified**:
- `/lib/data.ts` - Updated Fixture type
- `/lib/fpl.ts` - Added event number capture and logging
- `/components/PlayerFinder.tsx` - Display actual GW numbers

### 2. **Real FPL Deadline Now Displayed** ✅
**Problem**: Header showed mock deadline (next Friday 18:30) instead of real FPL deadline

**Solution**:
- Created `getRealDeadline()` async function that fetches from FPL API
- Added 15-minute caching to avoid excessive API calls
- Updated HeaderKpis to fetch and display real deadline with gameweek name
- Falls back gracefully to mock deadline if API fails

**Files Modified**:
- `/lib/date.ts` - Added `getRealDeadline()` with caching
- `/components/HeaderKpis.tsx` - Fetch and display real deadline

### 3. **Import Logging Added for Debugging** ✅
**Added Debug Logs**:
```typescript
console.log('[FPL] Fetching player data...');
console.log('[FPL] Current/Next Event ID:', nextEventId, 'Total events:', events.length);
console.log('[FPL] Next event details:', { id, name, deadline });
```

This helps diagnose import issues - check browser console when importing.

## How to Test

### Test Fixture Display:
1. Navigate to `/players` page
2. Click the info button (ℹ️) on any player
3. Check "Next Fixtures" section - should show actual GW numbers (e.g., GW7, GW8, GW9)
4. If you're in GW7, fixtures should show GW7+

### Test Real Deadline:
1. Check the header at top of any page
2. Should show: "Gameweek 7 Deadline: Fri 31 Jan 18:30" (example)
3. Countdown timer should be accurate to actual FPL deadline

### Test Import:
1. Go to `/import` page
2. Enter your FPL team ID
3. Click "Import"
4. Open browser console (F12) and check logs:
   - Should see `[FPL] Fetching player data...`
   - Should see current event ID (e.g., 7 for GW7)
   - Should see event details with actual deadline
5. Your squad should now load with correct players
6. Players' fixtures should show actual GW numbers

## Import Troubleshooting

If import still doesn't work:

1. **Check Console Logs**:
   - Open Developer Tools (F12)
   - Look for errors or warnings
   - Check what event ID is being detected

2. **Verify Team ID**:
   - Your team ID is in the URL: `fantasy.premierleague.com/entry/YOUR_ID/event/...`
   - Must be a valid, active FPL team

3. **Check API Response**:
   - Console will show event details
   - If event ID is wrong, FPL API might not have picks for that event yet

4. **Try Different Preset**:
   - Use "Baseline" preset first
   - Other presets (Conservative/Aggressive) use same data with different calibration

## Technical Details

### Fixture Event Numbers
- Each fixture in FPL API has an `event` field (gameweek number)
- We now capture and store this in our `Fixture` type
- UI checks for `fixture.event` and displays it when available
- Fallback: Uses relative notation (GW+1, GW+2, GW+3)

### Real Deadline Fetching
- HeaderKpis fetches deadline on component mount
- Uses `getRealDeadline()` which caches for 15 minutes
- Displays gameweek name (e.g., "Gameweek 7") + formatted deadline
- Countdown timer syncs with real deadline

### Import Flow
1. User enters team ID
2. Backend fetches bootstrap-static to get current/next event
3. Backend fetches picks for that event
4. Backend fetches full player pool with live prices/fixtures
5. Maps FPL element IDs to our player data
6. Returns Squad object with correct formation and captain

## Next Steps

If issues persist:
1. Check browser console for specific error messages
2. Verify FPL API is accessible (sometimes rate limited)
3. Try refreshing player data by clicking "Sync Prices" on import page
4. Clear browser cache and reload

The app now fetches real-time data from FPL and displays accurate gameweek information!
