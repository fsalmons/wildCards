# Game Mechanics

## Pack Collection Flow
1. User opens app → retro map loads, all stadium pins visible
2. GPS tracks user via `navigator.geolocation.watchPosition`
3. When user enters **100m radius** of a stadium → "Open Pack 🎴" button appears (pulsing)
4. Tap button → `PackOpening` modal opens full screen
5. Envelope tear animation plays (1.5s)
6. 5 cards revealed one-by-one via swipe/tap
7. Cards written to `user_cards` in Supabase
8. Modal closes, user returns to map

## Card Selection Logic
```
stadium.team_id
  → fetch all players WHERE team_id = stadium.team_id
  → shuffle array
  → take first 5
```
No rarity, no weighting, no cooldown, duplicates allowed.

## Proximity Check
```js
import { haversineDistance } from '../lib/geolocation'

const distance = haversineDistance(userLat, userLon, stadium.lat, stadium.lon)
const isNearby = distance <= 100 // meters
```

## Collection Progress
- Per team: `collected_distinct_players / total_players_on_roster`
- Per sport: `teams_with_at_least_one_card / total_teams_in_sport`

## Trading Rules
- Only between accepted friends
- 1-for-1 only
- One active pending trade per friend pair at a time
- States: `pending` → `accepted` or `rejected`
- On accept: atomic swap via `accept_trade` RPC (see supabase_patterns.md)
- Cards in pending trades are NOT locked for MVP

## Friendship Rules
- Bidirectional once accepted (one row covers both directions)
- Pending = requester → addressee only
- No blocking / unfriend for MVP
