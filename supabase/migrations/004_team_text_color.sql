-- Add text_color column to teams for per-team card text styling
ALTER TABLE teams ADD COLUMN IF NOT EXISTS text_color TEXT NOT NULL DEFAULT '#FFFFFF';
