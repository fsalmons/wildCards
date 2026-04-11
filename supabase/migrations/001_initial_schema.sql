-- Stadium Card Collector — Initial Schema
-- Run this in your Supabase SQL editor

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);

-- Stadiums (defined before teams due to circular ref; team_id FK added via ALTER)
CREATE TABLE stadiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stadiums_team_id ON stadiums(team_id);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('NWSL', 'CBB')),
  stadium_id UUID REFERENCES stadiums(id),
  primary_color TEXT NOT NULL DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from stadiums → teams now that teams table exists
ALTER TABLE stadiums ADD CONSTRAINT fk_stadiums_team_id
  FOREIGN KEY (team_id) REFERENCES teams(id);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  face_image TEXT,
  team_id UUID REFERENCES teams(id),
  position TEXT,
  age INTEGER,
  height TEXT,
  weight TEXT,
  card_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_players_team_id ON players(team_id);

-- User Cards (cards a user has collected)
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  collected_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_user_cards_player_id ON user_cards(player_id);

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);
CREATE INDEX idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);

-- Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  offered_card_id UUID REFERENCES user_cards(id),
  requested_card_id UUID REFERENCES user_cards(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trades_proposer_id ON trades(proposer_id);
CREATE INDEX idx_trades_receiver_id ON trades(receiver_id);
CREATE INDEX idx_trades_status ON trades(status);
