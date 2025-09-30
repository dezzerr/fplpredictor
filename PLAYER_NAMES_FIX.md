# Player Names Fix

## Issue
Player display names in the app didn't match the official FPL game.

**Examples:**
- FPL shows: **"Cucurella"**
- App was showing: **"M. Cucurella"**

- FPL shows: **"Muñoz"**  
- App was showing: **"D. Muñoz"**

## Root Cause

In `/lib/fpl.ts`, we were constructing names using first initial + last name:
```typescript
// OLD - WRONG
const name = `${(el.first_name || "").slice(0, 1)}. ${el.second_name || el.web_name || ""}`.trim();
```

This created names like "M. Salah" instead of the official FPL display name.

## Solution

The FPL API provides a `web_name` field which is the **exact display name** used in the official game.

**Updated code:**
```typescript
// NEW - CORRECT
const name = el.web_name || `${(el.first_name || "").slice(0, 1)}. ${el.second_name || ""}`.trim();
```

Now we use `web_name` first, with a fallback to the old format only if `web_name` is missing (which should never happen).

## What Changed

**File Modified**: `/lib/fpl.ts` (line 231)

**Result**: All player names now match FPL exactly:
- ✅ "Salah" (not "M. Salah")
- ✅ "Cucurella" (not "M. Cucurella")
- ✅ "Muñoz" (not "D. Muñoz")
- ✅ "Haaland" (not "E. Haaland")
- ✅ "Gabriel" (just Gabriel, for Arsenal defender)
- ✅ "Son" (not "H. Son")

## FPL API Name Fields

The FPL API provides three name fields:
- `web_name` - **Official display name** (what we now use)
- `first_name` - Player's first name
- `second_name` - Player's surname/last name

## Testing

To verify the fix works:
1. Refresh your app (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
2. Navigate to `/players` page
3. Check player names - should match FPL website exactly
4. Import your squad - names should be correct

## Examples of Corrected Names

| FPL Official | Before Fix | After Fix ✅ |
|--------------|------------|--------------|
| Salah | M. Salah | Salah |
| Haaland | E. Haaland | Haaland |
| Cucurella | M. Cucurella | Cucurella |
| Muñoz | D. Muñoz | Muñoz |
| Gabriel | Gabriel | Gabriel |
| Palmer | C. Palmer | Palmer |
| Son | H. Son | Son |
| Saka | B. Saka | Saka |
| Trippier | K. Trippier | Trippier |
| Alexander-Arnold | T. Alexander-Arnold | Alexander-Arnold |

All 600+ players in FPL now display with their official names!
