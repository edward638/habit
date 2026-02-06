-- Nugget Tracker Schema
-- Run this in your Supabase SQL Editor

-- Table to store the current nugget count
CREATE TABLE IF NOT EXISTS nugget_count (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial row
INSERT INTO nugget_count (id, count) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Table to store allowed editors (user IDs who can modify the count)
CREATE TABLE IF NOT EXISTS nugget_editors (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table to store the changelog
CREATE TABLE IF NOT EXISTS nugget_changelog (
  id SERIAL PRIMARY KEY,
  previous_count INTEGER NOT NULL,
  new_count INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nugget_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE nugget_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nugget_changelog ENABLE ROW LEVEL SECURITY;

-- Policies for nugget_count
-- Anyone can read
CREATE POLICY "Anyone can view nugget count"
  ON nugget_count FOR SELECT
  USING (true);

-- Only editors can update
CREATE POLICY "Editors can update nugget count"
  ON nugget_count FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nugget_editors WHERE user_id = auth.uid()
    )
  );

-- Policies for nugget_editors
-- Users can check if they are an editor (can only see their own row)
CREATE POLICY "Users can check own editor status"
  ON nugget_editors FOR SELECT
  USING (user_id = auth.uid());

-- Policies for nugget_changelog
-- Anyone can read the changelog
CREATE POLICY "Anyone can view changelog"
  ON nugget_changelog FOR SELECT
  USING (true);

-- Only editors can insert changelog entries
CREATE POLICY "Editors can insert changelog"
  ON nugget_changelog FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nugget_editors WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nugget_changelog_created_at ON nugget_changelog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nugget_editors_user_id ON nugget_editors(user_id);

-- To add yourself as an editor, run this after creating the tables:
-- INSERT INTO nugget_editors (user_id) VALUES ('your-user-id-here');
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
