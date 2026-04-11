ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 50;

ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_athlete_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_token_expires_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_card_id UUID REFERENCES user_cards(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_exercise_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_rating_points_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_strava_sync_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS strava_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT UNIQUE NOT NULL,
  elapsed_minutes INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strava_activities_user_id ON strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_strava_id ON strava_activities(strava_activity_id);
