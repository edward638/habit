-- Color Match Game Schema

CREATE TABLE color_match_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_color TEXT NOT NULL,
  input_color TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  delta_e REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_color_match_scores_user ON color_match_scores(user_id);
CREATE INDEX idx_color_match_scores_user_created ON color_match_scores(user_id, created_at DESC);

ALTER TABLE color_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own color match scores"
  ON color_match_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own color match scores"
  ON color_match_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own color match scores"
  ON color_match_scores FOR DELETE
  USING (auth.uid() = user_id);
