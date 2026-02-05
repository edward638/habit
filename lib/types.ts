export interface HabitWithStatus {
  id: number;
  name: string;
  created_at: string;
  completed: boolean;
  completedAt: string | null;
  currentStreak: number;
  longestStreak: number;
}
