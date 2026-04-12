-- Add logo_url column to teams for card display
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url TEXT;
