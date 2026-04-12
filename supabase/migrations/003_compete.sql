ALTER TABLE users ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 1000;

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','complete','rejected','forfeited')),
  challenger_wins INTEGER NOT NULL DEFAULT 0,
  opponent_wins INTEGER NOT NULL DEFAULT 0,
  current_round INTEGER NOT NULL DEFAULT 1,
  challenger_lock_ins_remaining INTEGER NOT NULL DEFAULT 5,
  opponent_lock_ins_remaining INTEGER NOT NULL DEFAULT 5,
  winner_id UUID REFERENCES users(id),
  challenger_elo_before INTEGER,
  opponent_elo_before INTEGER,
  elo_change INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  challenger_card_ids UUID[] NOT NULL DEFAULT '{}',
  opponent_card_ids UUID[] NOT NULL DEFAULT '{}',
  challenger_total INTEGER,
  opponent_total INTEGER,
  winner_id UUID REFERENCES users(id),
  challenger_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  opponent_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  challenger_continued BOOLEAN NOT NULL DEFAULT FALSE,
  opponent_continued BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_used_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_card_id UUID REFERENCES user_cards(id),
  round_number INTEGER NOT NULL
);

CREATE OR REPLACE FUNCTION resolve_series(comp_id UUID, p_winner_id UUID, p_loser_id UUID)
RETURNS void AS $$
DECLARE
  w_elo INTEGER; l_elo INTEGER; change INTEGER;
BEGIN
  SELECT elo INTO w_elo FROM users WHERE id = p_winner_id;
  SELECT elo INTO l_elo FROM users WHERE id = p_loser_id;
  change := ROUND(32 * (1 - 1.0 / (1 + power(10, (l_elo - w_elo)::FLOAT / 400))));
  UPDATE users SET elo = w_elo + change WHERE id = p_winner_id;
  UPDATE users SET elo = l_elo - change WHERE id = p_loser_id;
  UPDATE competitions SET
    status = 'complete', winner_id = p_winner_id, elo_change = change,
    challenger_elo_before = CASE WHEN challenger_id = p_winner_id THEN w_elo ELSE l_elo END,
    opponent_elo_before = CASE WHEN opponent_id = p_winner_id THEN w_elo ELSE l_elo END,
    updated_at = NOW()
  WHERE id = comp_id;
END;
$$ LANGUAGE plpgsql;
