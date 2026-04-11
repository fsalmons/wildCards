# Database Schema

Full schema lives in `supabase/migrations/001_initial_schema.sql`.

## Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| username | TEXT UNIQUE | login identifier |
| created_at | TIMESTAMPTZ | |

### `teams`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| sport | TEXT | 'NWSL' or 'CBB' |
| stadium_id | UUID FK → stadiums | |
| primary_color | TEXT | hex color for card theming |

### `stadiums`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| team_id | UUID FK → teams | one team per stadium |
| lat | DOUBLE PRECISION | |
| lon | DOUBLE PRECISION | |

### `players`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| first_name | TEXT | |
| last_name | TEXT | |
| face_image | TEXT | URL |
| team_id | UUID FK → teams | |
| position | TEXT | |
| age | INTEGER | |
| height | TEXT | e.g. "5'7\"" |
| weight | TEXT | e.g. "145lbs" |
| card_number | INTEGER | display number on card |

### `user_cards`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | CASCADE delete |
| player_id | UUID FK → players | |
| collected_at | TIMESTAMPTZ | |

### `friendships`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| requester_id | UUID FK → users | who sent the request |
| addressee_id | UUID FK → users | who received it |
| status | TEXT | 'pending' / 'accepted' / 'rejected' |
| UNIQUE | (requester_id, addressee_id) | |

### `trades`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| proposer_id | UUID FK → users | |
| receiver_id | UUID FK → users | |
| offered_card_id | UUID FK → user_cards | proposer's card |
| requested_card_id | UUID FK → user_cards | receiver's card |
| status | TEXT | 'pending' / 'accepted' / 'rejected' |
