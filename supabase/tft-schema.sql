-- TFT Analytics Schema
-- Run this in Supabase SQL Editor

-- Store daily snapshots of Challenger/GM players
CREATE TABLE tft_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  summoner_id TEXT NOT NULL,
  summoner_name TEXT NOT NULL,
  puuid TEXT NOT NULL,
  tier TEXT NOT NULL, -- 'CHALLENGER' or 'GRANDMASTER'
  lp INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, summoner_id)
);

-- Index for finding top LP gainers between dates
CREATE INDEX idx_tft_snapshots_date_lp ON tft_snapshots(snapshot_date, lp DESC);
CREATE INDEX idx_tft_snapshots_puuid ON tft_snapshots(puuid);

-- Store match metadata
CREATE TABLE tft_matches (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT UNIQUE NOT NULL,
  game_datetime TIMESTAMPTZ NOT NULL,
  game_length REAL NOT NULL, -- seconds
  game_version TEXT NOT NULL,
  queue_id INTEGER NOT NULL,
  tft_set_number INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tft_matches_datetime ON tft_matches(game_datetime DESC);
CREATE INDEX idx_tft_matches_set ON tft_matches(tft_set_number);

-- Store participant data per match
CREATE TABLE tft_match_participants (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES tft_matches(match_id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  placement INTEGER NOT NULL,
  level INTEGER NOT NULL,
  gold_left INTEGER NOT NULL,
  players_eliminated INTEGER NOT NULL,
  total_damage_to_players INTEGER NOT NULL,
  time_eliminated REAL NOT NULL,
  UNIQUE(match_id, puuid)
);

CREATE INDEX idx_tft_participants_puuid ON tft_match_participants(puuid);
CREATE INDEX idx_tft_participants_placement ON tft_match_participants(placement);

-- Store units used by participants
CREATE TABLE tft_units (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT NOT NULL REFERENCES tft_match_participants(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  tier INTEGER NOT NULL, -- star level
  rarity INTEGER NOT NULL -- cost
);

CREATE INDEX idx_tft_units_character ON tft_units(character_id);
CREATE INDEX idx_tft_units_participant ON tft_units(participant_id);

-- Store items on units
CREATE TABLE tft_items (
  id BIGSERIAL PRIMARY KEY,
  unit_id BIGINT NOT NULL REFERENCES tft_units(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL
);

CREATE INDEX idx_tft_items_item ON tft_items(item_id);
CREATE INDEX idx_tft_items_unit ON tft_items(unit_id);

-- Pre-computed daily aggregates for fast dashboard queries
CREATE TABLE tft_daily_aggregates (
  id BIGSERIAL PRIMARY KEY,
  aggregate_date DATE NOT NULL,
  aggregate_type TEXT NOT NULL, -- 'unit_playrate', 'item_playrate', 'unit_avg_placement'
  key TEXT NOT NULL, -- unit/item id
  value REAL NOT NULL, -- percentage or average
  sample_size INTEGER NOT NULL,
  metadata JSONB, -- additional context (e.g., placement buckets)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aggregate_date, aggregate_type, key)
);

CREATE INDEX idx_tft_aggregates_date_type ON tft_daily_aggregates(aggregate_date, aggregate_type);

-- Row Level Security (public read, service role write)
ALTER TABLE tft_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tft_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tft_match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tft_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tft_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tft_daily_aggregates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (TFT data is public game data)
CREATE POLICY "Allow public read on tft_snapshots" ON tft_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public read on tft_matches" ON tft_matches FOR SELECT USING (true);
CREATE POLICY "Allow public read on tft_match_participants" ON tft_match_participants FOR SELECT USING (true);
CREATE POLICY "Allow public read on tft_units" ON tft_units FOR SELECT USING (true);
CREATE POLICY "Allow public read on tft_items" ON tft_items FOR SELECT USING (true);
CREATE POLICY "Allow public read on tft_daily_aggregates" ON tft_daily_aggregates FOR SELECT USING (true);

-- Service role can insert/update (for cron jobs)
CREATE POLICY "Service role insert on tft_snapshots" ON tft_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert on tft_matches" ON tft_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert on tft_match_participants" ON tft_match_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert on tft_units" ON tft_units FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert on tft_items" ON tft_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert on tft_daily_aggregates" ON tft_daily_aggregates FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role update on tft_daily_aggregates" ON tft_daily_aggregates FOR UPDATE USING (true);
