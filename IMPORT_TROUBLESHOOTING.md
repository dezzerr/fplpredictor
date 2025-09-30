# FPL Squad Import Troubleshooting

## Common 404 Error Causes

### 1. **Invalid Team ID**
The most common cause of 404 errors.

**How to find your correct Team ID:**
1. Go to https://fantasy.premierleague.com
2. Log in and click "Pick Team"
3. Look at the URL: `fantasy.premierleague.com/entry/YOUR_ID/event/7`
4. Your Team ID is the number after `/entry/` (e.g., `1234567`)

**Example**: If URL is `fantasy.premierleague.com/entry/5678123/event/7`, your Team ID is `5678123`

### 2. **No Picks Made for Current Gameweek**
If you haven't made your picks yet for the upcoming gameweek, the import will fail.

**Solution**: 
- Make your picks on the official FPL website first
- Then try importing again

### 3. **Gameweek Status Issues**
The FPL API behaves differently depending on gameweek status:
- **Before deadline**: May not have picks available yet
- **After deadline**: Should work normally
- **During gameweek**: Uses current gameweek data

## Debugging Steps

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Try importing your team
4. Look for `[IMPORT]` logs that show:
   - Which Team ID is being used
   - Which Gameweek is being fetched
   - The exact URL being called
   - Success/failure status

**Example logs you should see:**
```
[IMPORT] Importing squad for entry: 1234567, preset: baseline
[IMPORT] Detected event ID: 7 from events: [...]
[IMPORT] Fetching picks from: https://fantasy.premierleague.com/api/entry/1234567/event/7/picks/
[IMPORT] Successfully loaded 15 picks for entry 1234567
[IMPORT] Successfully built squad with 11 starters and 4 bench players. Bank: 2.5
```

### Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try importing
4. Look for request to `/api/squad?entryId=...`
5. Click on it to see:
   - **Status Code**: Should be 200 (not 404)
   - **Response**: Check error message details
   - **Preview**: See what data is returned

## Error Messages Explained

### "FPL team not found or no picks available for GW{X}"
**Meaning**: Either:
- Team ID doesn't exist
- You haven't made picks for the detected gameweek yet
- The gameweek hasn't started accepting picks

**Fix**:
1. Verify your Team ID is correct
2. Make sure you've saved your team on FPL website
3. Wait until closer to the deadline (picks may not be available too early)

### "Failed to load FPL bootstrap"
**Meaning**: Can't connect to FPL API

**Fix**:
1. Check your internet connection
2. Check if FPL website is down
3. Try again in a few minutes

### "Could not determine current/next event"
**Meaning**: No active or upcoming gameweek found

**Fix**:
- This usually happens during off-season
- Wait for the season to start
- Or the FPL API is having issues

## Testing Your Team ID

You can test if your Team ID is valid by visiting:
```
https://fantasy.premierleague.com/api/entry/YOUR_ID/event/1/picks/
```

Replace `YOUR_ID` with your team ID. If you see JSON data, your ID is correct.

## Still Not Working?

1. **Try a different preset**: Switch between Conservative/Baseline/Aggressive
2. **Clear browser cache**: Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. **Check FPL API Status**: Visit https://fantasy.premierleague.com to ensure it's working
4. **Wait and retry**: Sometimes FPL API has rate limits or temporary issues

## Server Logs

The backend now logs detailed information. Check your terminal/console where `npm run dev` is running:

```bash
[IMPORT] Importing squad for entry: 1234567 preset: baseline
[IMPORT] Detected event ID: 7
[IMPORT] Fetching picks from: https://...
[IMPORT] Successfully loaded 15 picks
[IMPORT] Successfully built squad with 11 starters and 4 bench players
```

If you see errors there, they'll give you exact details about what went wrong.

## Success Checklist

✅ Team ID is correct (found from FPL URL)  
✅ Picks are made for current/next gameweek  
✅ FPL website is accessible  
✅ Browser console shows `[IMPORT] Successfully loaded...`  
✅ Your squad appears in the app  

If all checks pass and it still fails, the issue is likely with FPL API timing or availability.
