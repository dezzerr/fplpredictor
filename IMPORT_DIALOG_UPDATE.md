# Import Dialog Update

## What Changed

Replaced the separate import page (`/import`) with a convenient popup dialog accessible from any page.

## Features

### ✅ **Always Accessible**
- Import button in header (visible on all pages)
- Click "Import" to open dialog
- No need to navigate to separate page

### ✅ **Full Functionality**
- Enter FPL Team ID
- Select calibration preset (Conservative/Baseline/Aggressive)
- Import squad with one click
- Sync prices independently
- Real-time feedback with toast notifications
- Auto-closes on successful import

### ✅ **Better UX**
- **Keyboard support**: Press Enter to import
- **Loading states**: Buttons show "Importing..." when loading
- **Visual feedback**: Green for success, red for errors
- **Helpful tip**: Shows where to find your team ID
- **Non-blocking**: Dialog overlay, doesn't navigate away

## How to Use

1. Click **"Import"** button in header (top right)
2. Enter your FPL Team ID
3. Select a preset (default: Baseline)
4. Click **"Import Squad"**
5. Wait for success message
6. Dialog closes automatically - your squad is loaded!

## Where It Appears

The import dialog is available from:
- ✅ Main squad page (`/`)
- ✅ Players page (`/players`)
- ✅ Optimize page (`/optimize`)
- ✅ Any future pages

## Technical Details

**File Modified**: `/components/HeaderKpis.tsx`

**New Imports**:
- `useTransition` for React transitions
- `Select` component for preset dropdown
- `Squad`, `Player` types
- `toast` from Sonner for notifications

**State Management**:
- Uses Zustand store for `replaceSquad` and `syncPrices`
- Local state for dialog open/close
- Transition state for loading indicators

**API Integration**:
- Calls `/api/squad` to import
- Calls `/api/players` to sync prices
- Same backend as before, just different UI

## Benefits vs Old Import Page

| Old (Separate Page) | New (Dialog) ✅ |
|---------------------|-----------------|
| Navigate to /import | Click button anywhere |
| Full page reload | Stays on current page |
| Lose context | Maintains context |
| Multiple clicks | Single click |
| Less discoverable | Always visible |

## Toast Notifications

The dialog now uses toast notifications for better feedback:
- ✅ **Success**: "Imported team 1234567"
- ✅ **Success**: "Prices synced"
- ❌ **Error**: Shows specific error message
- ℹ️ **Warning**: "Enter your FPL team ID"

## Keyboard Shortcuts

- **Enter**: Import squad (when focused on team ID input)
- **Escape**: Close dialog
- **Tab**: Navigate between fields

## Next Steps

The old `/import` page still exists but is no longer linked. You can:
1. Keep it as fallback (users might have bookmarked it)
2. Delete it entirely since dialog is better
3. Redirect `/import` to home page

Recommend keeping it for now in case users have bookmarks.
