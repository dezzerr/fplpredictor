A sleek, modern Fantasy Premier League (FPL) companion app built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.  
Designed to help you manage your fantasy team with real-time stats, expected points models, and transfer/captaincy optimisation.

---

## 🚀 Features

- **Squad Builder**
  - Visual pitch layout for 11 starters + bench
  - Drag-and-drop players between pitch and bench
  - Captain & Vice-Captain selection
  - Formation support (default 4-4-2, flexible roadmap)

- **Player Finder Panel**
  - Price range slider
  - Search by name or team
  - Auto-filter (availability, fitness, etc.)
  - Scrollable player list with fixtures & expected points
  - One-click add to squad

- **Team Insights**
  - Team Rating %, Predicted Points, GW Rating %
  - Bank value editing
  - Constraint checks: squad size, budget, per-club limits

- **Bench & Chips Rail**
  - Bench slots (GK, DEF, MID, FWD)
  - Chip buttons: Wildcard, Free Hit, Bench Boost, Triple Captain

- **Player Sheet**
  - Slide-over detail view
  - Tabs: Overview, Next Fixtures, Form, Notes
  - Actions: Make Captain, Make Vice, Remove, Add to Watchlist

- **UI & UX**
  - Modern design inspired by Fantasy Football Hub
  - Responsive layout (desktop + mobile)
  - Smooth animations with Framer Motion
  - Accessible (focus rings, ARIA labels, dark mode ready)

---

## 🛠 Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) (utility-first styling)
- [shadcn/ui](https://ui.shadcn.com/) (beautiful UI primitives)
- [lucide-react](https://lucide.dev/) (icons)
- [Framer Motion](https://www.framer.com/motion/) (animations)
- [Zustand](https://zustand-demo.pmnd.rs/) (state management)

---

## 📈 Market-First Projections (Odds-Based)

- The app now prefers a Market/Odds-based projection pipeline by default.
- API routes `app/api/players/route.ts` and `app/api/squad/route.ts` use `lib/market.ts` to fetch players.
- If odds providers are not configured, the system cleanly falls back to the calibrated FPL `ep_next` model.

### How it works

- `lib/market.ts` exports `fetchPlayersWithMarket(preset)`.
- When odds are wired in, it will enrich each player with per-event expected points in `player.expExplain.eventEP[]` and tag `player.expExplain.source = 'market'`.
- `lib/optimizer.ts`'s `weeklyExp(player, weekOffset)` prefers `eventEP` when present; otherwise it uses the anchored FPL-based scaling.

### Environment variables

Create `.env.local` from `.env.local.example` and provide any available keys:

```
ODDS_API_KEY=
API_FOOTBALL_KEY=
BETFAIR_APP_KEY=
```

If none are set, the app uses FPL-based projections and sets `expExplain.source = 'fpl'`.

### Roadmap

- Add odds fetchers and caching.
- Compute per-event λg (goals), λa (assists proxy), pCS (clean sheet), p60 (minutes), and `eventEP[]`.
- UI tag in Player tooltips to show the projection source (Market/FPL).
