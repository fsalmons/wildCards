# WildCards

A mobile-first web app where you physically visit real sports stadiums to collect player trading cards. Built for WildHacks 2025.

---

## What It Is

WildCards turns attending college basketball and women's soccer games into a card-collecting meta-game. When your GPS puts you within 100 meters of a stadium, you unlock a pack of five player cards for that team. Cards have randomized ratings (1–99 OVR), can be upgraded on duplicate pulls, and are used to battle friends in a best-of-3 series — all from your phone's browser, no app install required.

**Sports covered:** Big Ten CBB (18 teams, 171 players) · NWSL

---

## Core Features

### GPS Pack Opening
Show up to a real stadium and tap **Open Pack**. The app verifies your coordinates against the stadium's lat/lon with a 100m Haversine distance check. Each stadium has a **30-minute cooldown** per device after opening — stored in localStorage per stadium ID.

Each pack reveals 5 cards in a swipeable flow with an envelope animation. Cards are flagged **NEW** (first time collecting that player) or **UPGRADE** (duplicate with a higher rating than your current copy).

### Player Cards
Every card shows:
- Player photo (or silhouette if uncollected)
- OVR rating (1–99, randomly assigned at collection time)
- Position · Age · Team name
- Team primary color as card border and accent

Cards render at two sizes: `small` (collection grid) and `full` (pack opening / overlay).

### Collection
Browse your full collection organized by team. Tap any card for a full-size overlay. Newly received cards from a trade appear in a **NEW** section at the top after the trade is accepted.

### Trading
Pick a friend, offer one of your cards, and request one of theirs. Trades are 1-for-1. Both cards swap ownership in Supabase on acceptance. Toast notifications alert both sides when a trade is proposed, accepted, or rejected.

### Battles (Compete)
Challenge any friend to a **best-of-3 card battle**:

1. Each player picks 5 cards from their collection per round
2. The player with the higher combined OVR total wins the round
3. Win 2 rounds to win the series

**Lock-Ins** let you hand-pick specific cards rather than get random ones. Each player starts with 5 lock-ins per series. Cards used in a round can't be reused in subsequent rounds.

ELO rating (starting at 1000, K=32) updates in Postgres via a `resolve_series` PL/pgSQL function after a series completes. A toast notification fires when a battle challenge arrives.

### Friends
Add friends by username. Incoming requests can be accepted or rejected. The friends list shows live trade badges and links directly to the trade screen.

### Notifications
A polling hook (`useNotifications`) runs every 15 seconds and on tab focus via the Page Visibility API. It detects new trade proposals, trade status changes, and incoming battle challenges, surfacing them as auto-dismissing toasts at the top of the screen.

### Onboarding
- **Welcome modal** — shown once on first login. Explains stadiums, trading, and the 10 starter cards every new account receives.
- **Battle info modal** — shown once the first time a friend is added or accepted. Explains best-of-3 rounds, lock-ins, and ELO.

Both are gated by localStorage flags (`scc_welcomed`, `scc_battle_info_seen`) so they appear exactly once.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, React Router v7 |
| Map | Leaflet.js + react-leaflet, CartoDB Positron tiles |
| Database | Supabase (Postgres) |
| Backend | Vercel Serverless Functions (`/api`) |
| Hosting | Vercel (HTTPS required for Geolocation API) |
| Styling | Inline styles + Tailwind tokens, `retro.css` for animations |

---

## Project Structure

```
src/
  pages/
    Login.jsx           # Username-based auth, seeds 10 starter cards for new users
    MapPage.jsx         # Leaflet map, GPS watch, stadium proximity, pack opening
    CollectionPage.jsx  # Team-grouped card grid with clickable overlays
    TradePage.jsx       # Propose and respond to 1-for-1 card trades
    FriendsPage.jsx     # Friend requests, friends list, trade badges
    ProfilePage.jsx     # User profile and ELO display

  components/
    Card/PlayerCard.jsx              # Core card component (small + full sizes)
    PackOpening/
      PackOpening.jsx                # Phase manager: loading → envelope → swipe → saving
      EnvelopeAnimation.jsx          # SVG envelope open animation
      CardSwipeFlow.jsx              # Swipeable card reveal with NEW/UPGRADE badges
    Compete/
      CompeteSection.jsx             # State machine for the full battle flow
      CompeteRoundPicker.jsx         # 5-slot card picker with lock-in mechanic
      RoundResult.jsx                # Round winner display
      SeriesComplete.jsx             # Series winner + ELO delta display
    Onboarding/OnboardingModal.jsx   # Reusable first-time modal
    Notifications/ToastStack.jsx     # Auto-dismissing toast overlay
    Trade/TradeScreen.jsx            # Trade proposal UI

  lib/
    supabase.js          # Supabase client (single instance)
    geolocation.js       # Haversine distance calculation
    competitionUtils.js  # Competition state machine helper
    elo.js               # ELO delta calculation (K=32)

api/
  compete/
    challenge.js                   # POST — create a new competition
    respond.js                     # POST — accept or reject a challenge
    submit-round.js                # POST — submit card picks for a round
    continue.js                    # POST — mark player ready for next round
    status/[competitionId].js      # GET  — poll competition state

scripts/
  seed-big-ten.js    # Fetches Big Ten teams + players from GitHub CSVs, seeds DB
  seed-teams.js      # NWSL team seed
  seed-stadiums.js   # Stadium coordinates seed
  seed-players.js    # Player data seed
```

---

## Database Schema

**Core tables** (`001_initial_schema.sql`):

| Table | Key Columns |
|---|---|
| `users` | `id` (UUID), `username` (unique), `elo` (int, default 1000) |
| `teams` | `name`, `sport` (NWSL/CBB), `primary_color` (hex) |
| `stadiums` | `name`, `lat`, `lon`, `team_id` FK |
| `players` | `first_name`, `last_name`, `face_image`, `position`, `age`, `team_id` FK, `card_number` |
| `user_cards` | `user_id` + `player_id` junction, `rating` (1–99), `collected_at` |
| `friendships` | `requester_id`, `addressee_id`, `status` (pending / accepted / rejected) |
| `trades` | `proposer_id`, `receiver_id`, offered + requested `user_card` IDs, `status` |

**Battle tables** (`003_compete.sql`):

| Table | Purpose |
|---|---|
| `competitions` | Challenger + opponent, win counts, lock-ins remaining, ELO snapshot |
| `competition_rounds` | Per-round card arrays, OVR totals, winner, submission / continuation flags |
| `competition_used_cards` | Cards played per user per round — prevents reuse across rounds |

ELO is resolved by the `resolve_series(comp_id, winner_id, loser_id)` PL/pgSQL function, which calculates the delta and updates both users atomically in a single transaction.

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `scc_user` | Persisted session `{id, username}` |
| `scc_pack_cd_<stadiumId>` | Pack cooldown expiry timestamp (per stadium) |
| `scc_dismissed_comps` | Array of competition IDs whose result screens have been dismissed |
| `scc_welcomed` | Flag: welcome onboarding has been shown |
| `scc_battle_info_seen` | Flag: battle info onboarding has been shown |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- Vercel account (for serverless functions in production)

### Environment Variables

Create `.env` at the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For the `/api` serverless functions, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your Vercel project environment settings.

### Database Setup

Run the three migrations in order in the Supabase SQL editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_scores_exercise.sql
supabase/migrations/003_compete.sql
```

### Seed Data

```bash
# Big Ten teams + players (pulls CSVs from GitHub)
node scripts/seed-big-ten.js

# NWSL teams, stadiums, and players
node scripts/seed-teams.js
node scripts/seed-stadiums.js
node scripts/seed-players.js
```

### Run Locally

```bash
npm install
npm run dev
```

GPS requires HTTPS in production. For local dev, `localhost` is treated as a secure context so geolocation works without a certificate.

---

## Deployment

`vercel.json` rewrites all non-API traffic to `index.html` for client-side routing. Push to `main` → Vercel auto-deploys.

```bash
npm run build   # Vite production build → dist/
```

---

## Key Design Decisions

**No auth library.** Users are identified by a unique username stored in localStorage. Simple enough for a hackathon and removes email/OAuth friction for demos.

**Rating as a collectible stat.** Each card pull assigns a random 1–99 OVR. A duplicate only upgrades your card if the new rating beats your existing one, making every pack opening meaningful even for players you already own.

**Polling over websockets.** The notification system polls every 15 seconds rather than using Supabase Realtime. Simpler to reason about and sufficient for turn-based trade/battle flows.

**Server-side card reuse prevention.** The `competition_used_cards` table tracks which cards have been played each round. The server rejects any submission containing a card already played in the current series, so the mechanic can't be bypassed client-side.
