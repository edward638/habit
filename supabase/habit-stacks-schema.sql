-- Habit Stacks Schema
-- Run this in Supabase SQL Editor

-- Stacks table
CREATE TABLE IF NOT EXISTS habit_stacks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habit_stacks_user ON habit_stacks(user_id);

-- Steps within a stack
CREATE TABLE IF NOT EXISTS habit_stack_steps (
  id BIGSERIAL PRIMARY KEY,
  stack_id BIGINT NOT NULL REFERENCES habit_stacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  linked_habit_id BIGINT REFERENCES habits(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stack_steps_stack ON habit_stack_steps(stack_id);
CREATE INDEX IF NOT EXISTS idx_stack_steps_linked_habit ON habit_stack_steps(linked_habit_id);

-- Per-step completions (date-aware)
CREATE TABLE IF NOT EXISTS habit_stack_step_completions (
  id BIGSERIAL PRIMARY KEY,
  step_id BIGINT NOT NULL REFERENCES habit_stack_steps(id) ON DELETE CASCADE,
  stack_id BIGINT NOT NULL REFERENCES habit_stacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(step_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stack_step_completions_stack_date ON habit_stack_step_completions(stack_id, date);
CREATE INDEX IF NOT EXISTS idx_stack_step_completions_user ON habit_stack_step_completions(user_id);

-- Enable RLS
ALTER TABLE habit_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_stack_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_stack_step_completions ENABLE ROW LEVEL SECURITY;

-- habit_stacks policies
CREATE POLICY "Users can view their own stacks"
  ON habit_stacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stacks"
  ON habit_stacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stacks"
  ON habit_stacks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stacks"
  ON habit_stacks FOR DELETE USING (auth.uid() = user_id);

-- habit_stack_steps policies
CREATE POLICY "Users can view their own steps"
  ON habit_stack_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own steps"
  ON habit_stack_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own steps"
  ON habit_stack_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own steps"
  ON habit_stack_steps FOR DELETE USING (auth.uid() = user_id);

-- habit_stack_step_completions policies
CREATE POLICY "Users can view their own step completions"
  ON habit_stack_step_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own step completions"
  ON habit_stack_step_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own step completions"
  ON habit_stack_step_completions FOR DELETE USING (auth.uid() = user_id);
