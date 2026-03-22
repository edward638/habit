export interface HabitWithStatus {
  id: number;
  name: string;
  created_at: string;
  completed: boolean;
  completedAt: string | null;
  currentStreak: number;
  longestStreak: number;
  is_paused: boolean;
}

export interface UserPuzzle {
  id: string;
  user_id: string;
  painting_id: string;
  revealed_tiles: number[];
  last_deduction_date: string | null;
  status: 'active' | 'completed' | 'guessed';
  created_at: string;
  updated_at: string;
}

export interface PiggyBank {
  id: string;
  user_id: string;
  balance_cents: number;
  last_deduction_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PiggyBankTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  type: 'habit_complete' | 'habit_missed' | 'withdrawal' | 'deduction';
  note: string | null;
  created_at: string;
}

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: number;
  title: string;
  target: number;
  current: number;
  unit: string;
  created_at: string;
  completed_at: string | null;
}

export interface NuggetCount {
  id: number;
  count: number;
  updated_at: string;
}

export interface NuggetChangelogEntry {
  id: number;
  previous_count: number;
  new_count: number;
  change_amount: number;
  note: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
}

export interface TrackedRestaurant {
  id: number;
  user_id: string;
  name: string;
  cuisine: string | null;
  release_day: string | null;
  release_time: string | null;
  resy_notify_enabled: boolean;
  status: 'watching' | 'booked' | 'paused';
  target_dates: string[] | null;
  preferred_times: string[] | null;
  party_size: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationLogEntry {
  id: number;
  restaurant_id: number;
  user_id: string;
  event_type: 'spotted' | 'booked' | 'missed' | 'checked';
  target_date: string | null;
  time_slot: string | null;
  notes: string | null;
  created_at: string;
}

export interface HabitStackStep {
  id: number;
  stack_id: number;
  label: string;
  linked_habit_id: number | null;
  sort_order: number;
  completed: boolean;
  completedAt: string | null;
}

export interface HabitStack {
  id: number;
  name: string;
  time_label: string | null;
  created_at: string;
  steps: HabitStackStep[];
  allCompleted: boolean;
  currentStreak: number;
  longestStreak: number;
}

export interface ArtCoachProject {
  id: number;
  title: string;
  description: string;
  total_sessions: number;
  completed_sessions: number;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface ArtCoachTask {
  id: number;
  project_id: number | null;
  date: string;
  title: string;
  description: string;
  medium: string;
  focus_area: string;
  difficulty: 'easy' | 'normal' | 'challenge';
  reference_source: string | null;
  duration_minutes: number;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  is_replacement: boolean;
  created_at: string;
  project?: ArtCoachProject | null;
}

export interface ArtCoachSession {
  id: number;
  task_id: number;
  duration_minutes: number;
  satisfaction_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface Quote {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

export interface AmexBalance {
  id: number;
  user_id: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface ColorMatchScore {
  id: number;
  target_color: string;
  input_color: string;
  score: number;
  delta_e: number;
  created_at: string;
}
