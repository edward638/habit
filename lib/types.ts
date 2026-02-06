export interface HabitWithStatus {
  id: number;
  name: string;
  created_at: string;
  completed: boolean;
  completedAt: string | null;
  currentStreak: number;
  longestStreak: number;
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
