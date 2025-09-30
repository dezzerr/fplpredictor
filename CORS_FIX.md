# CORS & Deadline Fix

## Problem
When trying to fetch the FPL deadline directly from the client component, browser blocked the request with CORS error:
```
Access to fetch at 'https://fantasy.premierleague.com/api/bootstrap-static/' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

Also had a type error where `formatDeadline` was receiving an object instead of a Date.

## Solution

### 1. Created Server-Side API Endpoint ✅
**File**: `/app/api/deadline/route.ts`

- Fetches FPL bootstrap data from server-side (no CORS issues)
- Returns deadline, event name, and event ID
- Has fallback to mock deadline on error
- Cached for 15 minutes (revalidate: 900)

### 2. Updated HeaderKpis Component ✅
**File**: `/components/HeaderKpis.tsx`

- Now fetches from `/api/deadline` (our own API)
- Properly handles Date objects
- Shows mock deadline initially, then updates with real deadline
- Graceful error handling

### 3. Simplified Date Utils ✅
**File**: `/lib/date.ts`

- Removed client-side FPL fetch (was causing CORS)
- `getMockDeadline()` returns simple Date object
- `formatDeadline()` properly formats with event name

## How It Works

```typescript
// Client (HeaderKpis) fetches from OUR API
fetch('/api/deadline')
  .then(res => res.json())
  .then(data => {
    setDeadline(new Date(data.deadline));
    setEventName(data.eventName);
  });

// Our API (/api/deadline/route.ts) fetches from FPL
// No CORS issues because it's server-side
const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
```

## Result

✅ **No more CORS errors**  
✅ **No more type errors**  
✅ **Real FPL deadline displayed**  
✅ **Proper gameweek name shown**  
✅ **Fallback to mock deadline if API fails**

## Files Modified

1. `/app/api/deadline/route.ts` - NEW server-side endpoint
2. `/components/HeaderKpis.tsx` - Fetch from our API
3. `/lib/date.ts` - Simplified, removed client-side fetch

The app should now load without errors and display the correct deadline!
