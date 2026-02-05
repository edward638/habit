'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { HabitWithStatus } from '@/lib/types';
import {
  fetchHabitsForDate,
  addHabit,
  deleteHabit,
  toggleCompletion,
  toDateString,
  isToday,
  isYesterday,
} from '@/lib/habits';

interface HabitTrackerProps {
  userEmail: string | null;
  userId: string;
}

export default function HabitTracker({ userEmail, userId }: HabitTrackerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  const viewingToday = isToday(selectedDate);
  const loading = loadedDate !== toDateString(selectedDate);

  useEffect(() => {
    let cancelled = false;
    const dateStr = toDateString(selectedDate);
    fetchHabitsForDate(supabase, userId, dateStr)
      .then(data => { if (!cancelled) { setHabits(data); setLoadedDate(dateStr); } })
      .catch(err => { if (!cancelled) { console.error('Failed to fetch habits:', err); setLoadedDate(dateStr); } });
    return () => { cancelled = true; };
  }, [supabase, userId, selectedDate]);

  async function handleAddHabit() {
    const name = newHabit.trim();
    if (!name) return;
    try {
      await addHabit(supabase, userId, name);
      setNewHabit('');
      const data = await fetchHabitsForDate(supabase, userId, toDateString(selectedDate));
      setHabits(data);
    } catch (err) {
      console.error('Failed to add habit:', err);
    }
  }

  async function handleToggle(habit: HabitWithStatus) {
    const prev = { completed: habit.completed, completedAt: habit.completedAt };
    setHabits(h => h.map(item => {
      if (item.id !== habit.id) return item;
      const nowCompleted = !item.completed;
      const newCurrent = nowCompleted ? item.currentStreak + 1 : Math.max(0, item.currentStreak - 1);
      return {
        ...item,
        completed: nowCompleted,
        completedAt: nowCompleted ? new Date().toISOString() : null,
        currentStreak: newCurrent,
        longestStreak: Math.max(item.longestStreak, newCurrent),
      };
    }));
    try {
      await toggleCompletion(supabase, userId, habit.id, toDateString(selectedDate), habit.completed);
    } catch {
      setHabits(h => h.map(item =>
        item.id === habit.id ? { ...item, ...prev } : item
      ));
    }
  }

  async function handleDelete(habitId: number) {
    const previous = habits;
    setHabits(h => h.filter(item => item.id !== habitId));
    try {
      await deleteHabit(supabase, habitId);
    } catch {
      setHabits(previous);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function goToPreviousDay() {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }

  function goToNextDay() {
    if (viewingToday) return;
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }

  function formatDateLabel(date: Date): string {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="max-w-md mx-auto px-4 pt-6 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {userEmail}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Log out
        </button>
      </header>
      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Habit Tracker
        </h1>

        {/* Date navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousDay}
            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
            aria-label="Previous day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDateLabel(selectedDate)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={goToNextDay}
            disabled={viewingToday}
            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Add habit form — only shown for today */}
        {viewingToday && (
          <form
            onSubmit={e => { e.preventDefault(); handleAddHabit(); }}
            className="flex gap-2 mb-8"
          >
            <input
              type="text"
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              placeholder="New habit..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </form>
        )}

        {/* Habit list */}
        {loading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">Loading...</p>
        ) : habits.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">
            {viewingToday ? 'No habits yet. Add one above to get started.' : 'No habits for this day.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {habits.map(habit => (
              <li
                key={habit.id}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={habit.completed}
                  onChange={() => handleToggle(habit)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        habit.completed
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-900 dark:text-white'
                      }
                    >
                      {habit.name}
                    </span>
                    {habit.currentStreak > 0 && (
                      <span className="text-xs font-medium text-orange-500 dark:text-orange-400">
                        🔥 {habit.currentStreak}d
                      </span>
                    )}
                  </div>
                  {habit.longestStreak > habit.currentStreak && habit.longestStreak > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Best: {habit.longestStreak}d
                    </p>
                  )}
                  {habit.completedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Completed at {new Date(habit.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {viewingToday && (
                  <button
                    onClick={() => handleDelete(habit.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Delete ${habit.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Summary */}
        {!loading && habits.length > 0 && (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            {habits.filter(h => h.completed).length} of {habits.length} completed
            {viewingToday ? ' today' : ` on ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
          </p>
        )}
      </main>
    </div>
  );
}
