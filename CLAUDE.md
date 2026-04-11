# Stadium Card Collector

## What this is
A mobile-first web app (iPhone Chrome/Safari) where users visit real NWSL and CBB 
stadiums via GPS to collect player trading cards. Retro sticker pack theme.

## Tech Stack
- Frontend: React (Vite), mobile-first, no SSR
- Database: Supabase (Postgres + realtime)
- Map: Leaflet.js with retro tile layer
- Hosting: Vercel (HTTPS required for geolocation)
- CSS: Tailwind + custom retro tokens in src/styles/retro.css

## Key Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
- `node scripts/seed-stadiums.js` — seed stadium data
- `node scripts/seed-players.js` — seed player data

## Architecture rules
- All Supabase queries go through src/lib/supabase.js — never instantiate client inline
- GPS logic lives in src/lib/geolocation.js only
- Components are in src/components/, pages in src/pages/
- No default exports — named exports only
- Mobile first: design for 390px, scale up

## Design rules
- Retro sticker pack theme — warm beige (#F5ECD7) card backgrounds
- Team primary color used for card border + accent text
- Chunky retro font (Fredoka One) for headings
- Uncollected cards = greyed silhouette + "?"
- Refer to agent_docs/ for patterns before writing new code
