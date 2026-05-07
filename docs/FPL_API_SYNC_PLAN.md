# FPL API Sync - Implementation Plan

> **Status**: Planning Phase  
> **Created**: January 6, 2026  
> **Purpose**: Enable automatic synchronization of transfers and substitutions between this app and the official FPL platform

---

## Overview

The Fantasy Premier League API supports **write operations** including transfers and substitutions through authenticated endpoints. This document outlines the plan to implement two-way sync between this app and FPL.

---

## API Capabilities

### Authentication
The FPL API uses **session-based authentication** via cookies:
1. User logs in to `fantasy.premierleague.com`
2. Session cookie is extracted and stored
3. Cookie is passed with all authenticated API requests

### Available Write Endpoints

| Action | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| Make Transfers | `/api/transfers/` | POST | Transfer players in/out |
| Set Team/Subs | `/api/my-team/{manager_id}/` | POST | Update lineup and bench order |
| Set Captain | `/api/my-team/{manager_id}/` | POST | Update captain/vice selections |

### Read Endpoints (Already Implemented)
- `/api/bootstrap-static/` - All players, teams, gameweeks
- `/api/element-summary/{player_id}/` - Player history
- `/api/entry/{manager_id}/` - Manager info
- `/api/my-team/{manager_id}/` - Current team (authenticated)

---

## Implementation Phases

### Phase 1: Authentication Flow

**Goal**: Allow users to securely connect their FPL account

#### Tasks
1. **Create FPL Login Page**
   - Email/password form
   - "Connect FPL Account" button
   - Clear explanation of what access is granted

2. **Server-Side Authentication Proxy**
   - Create `/api/fpl-auth/login` endpoint
   - POST credentials to FPL login endpoint
   - Extract and return session cookies
   - Handle login errors (invalid credentials, 2FA, etc.)

3. **Secure Session Storage**
   - Encrypt session cookie before storing
   - Store in HTTP-only secure cookie or server-side session
   - Associate with user's account in database

4. **Session Management**
   - Check session validity before operations
   - Auto-refresh expired sessions
   - Prompt re-login when needed

#### FPL Login Endpoint
```
POST https://users.premierleague.com/accounts/login/
Content-Type: application/x-www-form-urlencoded

login={email}&password={password}&app=plfpl-web&redirect_uri=https://fantasy.premierleague.com/
```

---

### Phase 2: Sync Actions

**Goal**: Push changes made in this app to FPL

#### Tasks
1. **"Apply to FPL" Button**
   - Add prominent button after making changes
   - Show only when there are unsaved changes
   - Disabled if not connected to FPL

2. **Transfer Sync**
   - Compare app transfers with FPL state
   - Build transfer payload
   - POST to `/api/transfers/`
   - Handle transfer cost/hits

3. **Substitution Sync**
   - Build picks array with positions
   - Include bench order
   - POST to `/api/my-team/{id}/`

4. **Captain Sync**
   - Include captain/vice_captain in picks payload
   - Validate captain is in starting XI

5. **Confirmation Modal**
   - Show summary of changes before applying
   - Display any point hits for transfers
   - Require explicit confirmation

#### Transfer Payload Example
```json
{
  "chip": null,
  "entry": 12345,
  "event": 21,
  "transfers": [
    {
      "element_in": 401,
      "element_out": 302,
      "purchase_price": 105,
      "selling_price": 100
    }
  ]
}
```

#### Team Selection Payload Example
```json
{
  "chip": null,
  "picks": [
    {"element": 400, "position": 1, "is_captain": false, "is_vice_captain": false},
    {"element": 253, "position": 2, "is_captain": false, "is_vice_captain": false},
    {"element": 234, "position": 3, "is_captain": true, "is_vice_captain": false},
    {"element": 201, "position": 15, "is_captain": false, "is_vice_captain": false}
  ]
}
```

---

### Phase 3: Two-Way Sync

**Goal**: Keep app and FPL in perfect sync

#### Tasks
1. **Pull from FPL** (Already implemented)
   - Import team by ID
   - Refresh team data

2. **Push to FPL** (Phase 2)
   - Apply transfers
   - Apply substitutions

3. **Conflict Resolution**
   - Detect differences between app and FPL
   - Show diff to user
   - Options: "Use App Version" / "Use FPL Version"

4. **Auto-Sync Option**
   - Toggle for automatic sync
   - Sync on every change (with debounce)
   - Show sync status indicator

---

## Technical Architecture

### Request Flow
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js API     │────▶│   FPL API   │
│   (App)     │◀────│  (Server Proxy)  │◀────│             │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  Session Store   │
                    │  (Encrypted)     │
                    └──────────────────┘
```

### Why Server Proxy?
- **CORS Policy**: FPL API blocks direct browser requests
- **Security**: Credentials never exposed to client
- **Session Management**: Server handles cookie lifecycle

---

## Security Considerations

### Must Have
- [ ] **Never store FPL passwords** - Only session tokens
- [ ] **Server-side proxy** - All FPL calls through backend
- [ ] **HTTPS only** - Encrypt all traffic
- [ ] **Encrypted storage** - Encrypt session cookies at rest
- [ ] **Session timeout** - Auto-logout after inactivity
- [ ] **Secure cookies** - HTTP-only, Secure, SameSite flags

### Nice to Have
- [ ] **Rate limiting** - Prevent abuse
- [ ] **Audit logging** - Track all FPL operations
- [ ] **2FA support** - Handle FPL two-factor auth

---

## Limitations & Risks

### Technical Limitations
1. **CORS Policy** - Must use server proxy (solved)
2. **Rate Limiting** - FPL may throttle excessive requests
3. **Session Expiry** - Cookies expire, need re-auth flow
4. **API Changes** - FPL may change endpoints without notice

### Legal/ToS Considerations
- Review FPL Terms of Service for automation rules
- This is for personal use, not commercial exploitation
- Similar to existing tools (fpl Python library, R fantasy package)

### User Experience
- Clear communication about what the app can do
- Explicit consent before any FPL modifications
- Easy disconnect/revoke access option

---

## File Structure (Proposed)

```
/app/api/fpl-sync/
  ├── login/route.ts       # Authenticate with FPL
  ├── logout/route.ts      # Clear FPL session
  ├── status/route.ts      # Check connection status
  ├── transfers/route.ts   # Push transfers to FPL
  └── team/route.ts        # Push team selection to FPL

/lib/
  └── fpl-sync.ts          # FPL sync utilities

/components/
  ├── FplConnectButton.tsx # Connect account button
  ├── FplSyncButton.tsx    # Apply changes button
  └── FplSyncModal.tsx     # Confirmation modal

/store/
  └── fpl-sync.ts          # Sync state (Zustand)
```

---

## Implementation Order

1. **Phase 1A**: Basic login flow (email/password → session)
2. **Phase 1B**: Session storage and validation
3. **Phase 2A**: Transfer sync endpoint
4. **Phase 2B**: Team selection sync endpoint
5. **Phase 2C**: UI components (buttons, modals)
6. **Phase 3**: Conflict resolution and auto-sync

---

## References

- [FPL API Documentation (Unofficial)](https://www.oliverlooney.com/blogs/FPL-APIs-Explained)
- [fpl Python Library](https://fpl.readthedocs.io/)
- [fantasy R Package](https://github.com/chrisbrownlie/fantasy)
- [FPL API Endpoints Cheat Sheet](https://cheatography.com/sertalpbilal/cheat-sheets/fpl-api-endpoints/)

---

## Notes

- The FPL API is **unofficial** and undocumented by the Premier League
- Endpoints may change between seasons
- Always test thoroughly before deploying
- Consider adding a "dry run" mode that shows what would happen without actually making changes
