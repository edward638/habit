-- Reservations Tracking Schema
-- Run this in Supabase SQL Editor

-- Tracked restaurants table
CREATE TABLE IF NOT EXISTS tracked_restaurants (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cuisine TEXT,
  release_day TEXT, -- e.g., "30 days out", "Every Monday", "Unknown"
  release_time TEXT, -- e.g., "Midnight ET", "9am ET", "Unknown"
  resy_notify_enabled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'watching' CHECK (status IN ('watching', 'booked', 'paused')),
  target_dates TEXT[], -- Array of target date strings
  preferred_times TEXT[], -- e.g., ['5:00 PM', '7:00 PM']
  party_size INTEGER DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability/booking log
CREATE TABLE IF NOT EXISTS reservation_log (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES tracked_restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('spotted', 'booked', 'missed', 'checked')),
  target_date DATE,
  time_slot TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tracked_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracked_restaurants
CREATE POLICY "Users can view own restaurants"
  ON tracked_restaurants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own restaurants"
  ON tracked_restaurants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own restaurants"
  ON tracked_restaurants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own restaurants"
  ON tracked_restaurants FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for reservation_log
CREATE POLICY "Users can view own logs"
  ON reservation_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own logs"
  ON reservation_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own logs"
  ON reservation_log FOR DELETE
  USING (user_id = auth.uid());

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tracked_restaurants_user ON tracked_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_log_restaurant ON reservation_log(restaurant_id);
