'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { HabitWithStatus, Todo, Note, Goal } from '@/lib/types';
import {
  fetchHabitsForDate,
  addHabit,
  deleteHabit,
  toggleCompletion,
  updateHabit,
  toDateString,
  isToday,
  isYesterday,
} from '@/lib/habits';
import {
  fetchTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  updateTodo,
} from '@/lib/todos';
import {
  fetchNotes,
  addNote,
  updateNote,
  deleteNote,
} from '@/lib/notes';
import {
  fetchGoals,
  addGoal,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
} from '@/lib/goals';
import { useTheme } from './theme-provider';
import TftDashboard from './tft-dashboard';

interface HabitTrackerProps {
  userEmail: string | null;
  userId: string;
}

export default function HabitTracker({ userEmail, userId }: HabitTrackerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { theme, setTheme, themes } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Habit state
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitWithStatus | null>(null);

  // To-Do state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [todosLoaded, setTodosLoaded] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('items');

  // Edit state
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [editingHabitName, setEditingHabitName] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState('');
  const [editingGoalTarget, setEditingGoalTarget] = useState('');
  const [editingGoalUnit, setEditingGoalUnit] = useState('');

  const viewingToday = isToday(selectedDate);
  const loading = loadedDate !== toDateString(selectedDate);

  // Fetch habits
  useEffect(() => {
    let cancelled = false;
    const dateStr = toDateString(selectedDate);
    fetchHabitsForDate(supabase, userId, dateStr)
      .then(data => { if (!cancelled) { setHabits(data); setLoadedDate(dateStr); } })
      .catch(err => { if (!cancelled) { console.error('Failed to fetch habits:', err); setLoadedDate(dateStr); } });
    return () => { cancelled = true; };
  }, [supabase, userId, selectedDate]);

  // Fetch todos
  useEffect(() => {
    let cancelled = false;
    fetchTodos(supabase, userId)
      .then(data => { if (!cancelled) { setTodos(data); setTodosLoaded(true); } })
      .catch(err => { if (!cancelled) { console.error('Failed to fetch todos:', err); setTodosLoaded(true); } });
    return () => { cancelled = true; };
  }, [supabase, userId]);

  // Fetch notes
  useEffect(() => {
    let cancelled = false;
    fetchNotes(supabase, userId)
      .then(data => { if (!cancelled) { setNotes(data); setNotesLoaded(true); } })
      .catch(err => { if (!cancelled) { console.error('Failed to fetch notes:', err); setNotesLoaded(true); } });
    return () => { cancelled = true; };
  }, [supabase, userId]);

  // Fetch goals
  useEffect(() => {
    let cancelled = false;
    fetchGoals(supabase, userId)
      .then(data => { if (!cancelled) { setGoals(data); setGoalsLoaded(true); } })
      .catch(err => { if (!cancelled) { console.error('Failed to fetch goals:', err); setGoalsLoaded(true); } });
    return () => { cancelled = true; };
  }, [supabase, userId]);

  // Habit handlers
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

  async function handleDeleteHabit(habitId: number) {
    const previous = habits;
    setHabits(h => h.filter(item => item.id !== habitId));
    try {
      await deleteHabit(supabase, habitId);
    } catch {
      setHabits(previous);
    }
  }

  // To-Do handlers
  async function handleAddTodo() {
    const title = newTodo.trim();
    if (!title) return;
    try {
      const todo = await addTodo(supabase, userId, title);
      setTodos(t => [todo, ...t]);
      setNewTodo('');
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    const prev = { completed: todo.completed, completed_at: todo.completed_at };
    setTodos(t => t.map(item =>
      item.id === todo.id
        ? { ...item, completed: !item.completed, completed_at: item.completed ? null : new Date().toISOString() }
        : item
    ));
    try {
      await toggleTodo(supabase, todo.id, todo.completed);
    } catch {
      setTodos(t => t.map(item =>
        item.id === todo.id ? { ...item, ...prev } : item
      ));
    }
  }

  async function handleDeleteTodo(todoId: number) {
    const previous = todos;
    setTodos(t => t.filter(item => item.id !== todoId));
    try {
      await deleteTodo(supabase, todoId);
    } catch {
      setTodos(previous);
    }
  }

  // Note handlers
  async function handleAddNote() {
    const title = newNoteTitle.trim();
    if (!title) return;
    try {
      const note = await addNote(supabase, userId, title);
      setNotes(n => [note, ...n]);
      setNewNoteTitle('');
      setSelectedNote(note);
      setNoteContent('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  }

  function handleSelectNote(note: Note) {
    // Save current note before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (selectedNote && noteContent !== selectedNote.content) {
      updateNote(supabase, selectedNote.id, { content: noteContent }).catch(console.error);
    }
    setSelectedNote(note);
    setNoteContent(note.content);
  }

  function handleNoteContentChange(content: string) {
    setNoteContent(content);
    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (selectedNote) {
        updateNote(supabase, selectedNote.id, { content }).catch(console.error);
        setNotes(n => n.map(note =>
          note.id === selectedNote.id ? { ...note, content, updated_at: new Date().toISOString() } : note
        ));
      }
    }, 1000);
  }

  async function handleDeleteNote(noteId: number) {
    const previous = notes;
    setNotes(n => n.filter(item => item.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setNoteContent('');
    }
    try {
      await deleteNote(supabase, noteId);
    } catch {
      setNotes(previous);
    }
  }

  // Goal handlers
  async function handleAddGoal() {
    const title = newGoalTitle.trim();
    const target = parseInt(newGoalTarget, 10);
    if (!title || !target || target <= 0) return;
    try {
      const goal = await addGoal(supabase, userId, title, target, newGoalUnit);
      setGoals(g => [goal, ...g]);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalUnit('items');
      setShowAddGoal(false);
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  }

  async function handleUpdateProgress(goal: Goal, delta: number) {
    const newCurrent = Math.max(0, Math.min(goal.target, goal.current + delta));
    const prev = { current: goal.current, completed_at: goal.completed_at };
    setGoals(g => g.map(item =>
      item.id === goal.id
        ? { ...item, current: newCurrent, completed_at: newCurrent >= goal.target ? new Date().toISOString() : null }
        : item
    ));
    try {
      await updateGoalProgress(supabase, goal.id, newCurrent, goal.target);
    } catch {
      setGoals(g => g.map(item =>
        item.id === goal.id ? { ...item, ...prev } : item
      ));
    }
  }

  async function handleDeleteGoal(goalId: number) {
    const previous = goals;
    setGoals(g => g.filter(item => item.id !== goalId));
    try {
      await deleteGoal(supabase, goalId);
    } catch {
      setGoals(previous);
    }
  }

  // Edit handlers
  function startEditHabit(habit: HabitWithStatus) {
    setEditingHabitId(habit.id);
    setEditingHabitName(habit.name);
  }

  async function saveEditHabit() {
    if (!editingHabitId) return;
    const name = editingHabitName.trim();
    if (!name) {
      setEditingHabitId(null);
      return;
    }
    const previous = habits;
    setHabits(h => h.map(item =>
      item.id === editingHabitId ? { ...item, name } : item
    ));
    setEditingHabitId(null);
    try {
      await updateHabit(supabase, editingHabitId, name);
    } catch {
      setHabits(previous);
    }
  }

  function startEditTodo(todo: Todo) {
    setEditingTodoId(todo.id);
    setEditingTodoTitle(todo.title);
  }

  async function saveEditTodo() {
    if (!editingTodoId) return;
    const title = editingTodoTitle.trim();
    if (!title) {
      setEditingTodoId(null);
      return;
    }
    const previous = todos;
    setTodos(t => t.map(item =>
      item.id === editingTodoId ? { ...item, title } : item
    ));
    setEditingTodoId(null);
    try {
      await updateTodo(supabase, editingTodoId, title);
    } catch {
      setTodos(previous);
    }
  }

  function startEditGoal(goal: Goal) {
    setEditingGoalId(goal.id);
    setEditingGoalTitle(goal.title);
    setEditingGoalTarget(goal.target.toString());
    setEditingGoalUnit(goal.unit);
  }

  async function saveEditGoal() {
    if (!editingGoalId) return;
    const title = editingGoalTitle.trim();
    const target = parseInt(editingGoalTarget, 10);
    const unit = editingGoalUnit.trim();
    if (!title || !target || target <= 0 || !unit) {
      setEditingGoalId(null);
      return;
    }
    const previous = goals;
    setGoals(g => g.map(item =>
      item.id === editingGoalId ? { ...item, title, target, unit } : item
    ));
    setEditingGoalId(null);
    try {
      await updateGoal(supabase, editingGoalId, { title, target, unit });
    } catch {
      setGoals(previous);
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
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <header className="max-w-6xl mx-auto px-4 pt-6 flex items-center justify-between">
        <span className="text-sm truncate" style={{ color: theme.colors.textMuted }}>
          {userEmail}
        </span>
        <div className="flex items-center gap-3">
          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 transition-colors"
              style={{ color: theme.colors.textMuted }}
              aria-label="Change theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
            </button>
            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-2 z-50" style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}>
                  <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                    Theme
                  </p>
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                      className="w-full px-3 py-2 flex items-center gap-3 transition-colors"
                      style={{ backgroundColor: theme.id === t.id ? theme.colors.border + '40' : 'transparent' }}
                    >
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.colors.primary, borderColor: theme.colors.border }} />
                      <span className="text-sm" style={{ color: theme.colors.text }}>{t.name}</span>
                      {theme.id === t.id && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={handleLogout} className="text-sm hover:text-red-500 transition-colors" style={{ color: theme.colors.textMuted }}>
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Habit Tracker - Top Left */}
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>Habit Tracker</h2>

            {/* Date navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPreviousDay} className="p-2 transition-colors" style={{ color: theme.colors.textMuted }} aria-label="Previous day">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: theme.colors.text }}>{formatDateLabel(selectedDate)}</p>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>{selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={goToNextDay} disabled={viewingToday} className="p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" style={{ color: theme.colors.textMuted }} aria-label="Next day">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Add habit form */}
            {viewingToday && (
              <form onSubmit={e => { e.preventDefault(); handleAddHabit(); }} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newHabit}
                  onChange={e => setNewHabit(e.target.value)}
                  placeholder="New habit..."
                  className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                />
                <button type="submit" className="px-3 py-2 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: theme.colors.primary }}>Add</button>
              </form>
            )}

            {/* Habit list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>Loading...</p>
              ) : habits.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>
                  {viewingToday ? 'No habits yet.' : 'No habits for this day.'}
                </p>
              ) : (
                habits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                    <input
                      type="checkbox"
                      checked={habit.completed}
                      onChange={() => handleToggle(habit)}
                      className="h-4 w-4 rounded cursor-pointer"
                      style={{ accentColor: theme.colors.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      {editingHabitId === habit.id ? (
                        <form onSubmit={e => { e.preventDefault(); saveEditHabit(); }} className="flex gap-2">
                          <input
                            type="text"
                            value={editingHabitName}
                            onChange={e => setEditingHabitName(e.target.value)}
                            onBlur={saveEditHabit}
                            autoFocus
                            className="flex-1 px-2 py-1 rounded border text-sm focus:outline-none"
                            style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm truncate cursor-pointer ${habit.completed ? 'line-through' : ''}`}
                            style={{ color: habit.completed ? theme.colors.textMuted : theme.colors.text }}
                            onDoubleClick={() => viewingToday && startEditHabit(habit)}
                            title={viewingToday ? 'Double-click to edit' : ''}
                          >
                            {habit.name}
                          </span>
                          {habit.currentStreak > 0 && (
                            <span className="text-xs font-medium flex-shrink-0" style={{ color: theme.colors.streak }}>🔥 {habit.currentStreak}d</span>
                          )}
                        </div>
                      )}
                    </div>
                    {viewingToday && editingHabitId !== habit.id && (
                      <>
                        <button onClick={() => startEditHabit(habit)} className="text-gray-400 hover:text-blue-500 flex-shrink-0" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button onClick={() => setHabitToDelete(habit)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {!loading && habits.length > 0 && (
              <p className="mt-4 text-xs text-center" style={{ color: theme.colors.textMuted }}>
                {habits.filter(h => h.completed).length} of {habits.length} completed
              </p>
            )}
          </section>

          {/* To-Do List - Top Right */}
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>To-Do List</h2>

            {/* Add todo form */}
            <form onSubmit={e => { e.preventDefault(); handleAddTodo(); }} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                placeholder="New task..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
              />
              <button type="submit" className="px-3 py-2 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: theme.colors.primary }}>Add</button>
            </form>

            {/* Todo list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {!todosLoaded ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>Loading...</p>
              ) : todos.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>No tasks yet.</p>
              ) : (
                todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleTodo(todo)}
                      className="h-4 w-4 rounded cursor-pointer"
                      style={{ accentColor: theme.colors.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      {editingTodoId === todo.id ? (
                        <form onSubmit={e => { e.preventDefault(); saveEditTodo(); }}>
                          <input
                            type="text"
                            value={editingTodoTitle}
                            onChange={e => setEditingTodoTitle(e.target.value)}
                            onBlur={saveEditTodo}
                            autoFocus
                            className="w-full px-2 py-1 rounded border text-sm focus:outline-none"
                            style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                          />
                        </form>
                      ) : (
                        <>
                          <span
                            className={`text-sm truncate block cursor-pointer ${todo.completed ? 'line-through' : ''}`}
                            style={{ color: todo.completed ? theme.colors.textMuted : theme.colors.text }}
                            onDoubleClick={() => startEditTodo(todo)}
                            title="Double-click to edit"
                          >
                            {todo.title}
                          </span>
                          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                            {todo.completed_at
                              ? `Completed ${new Date(todo.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : `Added ${new Date(todo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                          </p>
                        </>
                      )}
                    </div>
                    {editingTodoId !== todo.id && (
                      <>
                        <button onClick={() => startEditTodo(todo)} className="text-gray-400 hover:text-blue-500 shrink-0" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-gray-400 hover:text-red-500 shrink-0" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {todosLoaded && todos.length > 0 && (
              <p className="mt-4 text-xs text-center" style={{ color: theme.colors.textMuted }}>
                {todos.filter(t => t.completed).length} of {todos.length} completed
              </p>
            )}
          </section>

          {/* Notes - Bottom Left */}
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>Notes</h2>

            {/* Add note form */}
            <form onSubmit={e => { e.preventDefault(); handleAddNote(); }} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                placeholder="New note title..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
              />
              <button type="submit" className="px-3 py-2 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: theme.colors.primary }}>Add</button>
            </form>

            <div className="flex gap-4 h-64">
              {/* Note list */}
              <div className="w-1/3 space-y-1 overflow-y-auto">
                {!notesLoaded ? (
                  <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>Loading...</p>
                ) : notes.length === 0 ? (
                  <p className="text-center py-4 text-xs" style={{ color: theme.colors.textMuted }}>No notes yet.</p>
                ) : (
                  notes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors group flex items-center justify-between ${selectedNote?.id === note.id ? '' : 'hover:opacity-80'}`}
                      style={{ backgroundColor: selectedNote?.id === note.id ? theme.colors.primary + '20' : theme.colors.background }}
                    >
                      <span className="text-sm truncate" style={{ color: theme.colors.text }}>{note.title || 'Untitled'}</span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Note editor */}
              <div className="flex-1">
                {selectedNote ? (
                  <textarea
                    value={noteContent}
                    onChange={e => handleNoteContentChange(e.target.value)}
                    placeholder="Write your note..."
                    className="w-full h-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                    style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-lg border" style={{ borderColor: theme.colors.border }}>
                    <p className="text-sm" style={{ color: theme.colors.textMuted }}>Select a note to edit</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Goal Tracker - Bottom Right */}
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Goals</h2>
              <button
                onClick={() => setShowAddGoal(!showAddGoal)}
                className="text-sm px-2 py-1 rounded transition-colors"
                style={{ color: theme.colors.primary }}
              >
                {showAddGoal ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {/* Add goal form */}
            {showAddGoal && (
              <div className="mb-4 p-3 rounded-lg space-y-2" style={{ backgroundColor: theme.colors.background }}>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  placeholder="Goal title (e.g., Read books)"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newGoalTarget}
                    onChange={e => setNewGoalTarget(e.target.value)}
                    placeholder="Target"
                    min="1"
                    className="w-20 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                  />
                  <input
                    type="text"
                    value={newGoalUnit}
                    onChange={e => setNewGoalUnit(e.target.value)}
                    placeholder="Unit"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                  />
                  <button
                    onClick={handleAddGoal}
                    className="px-3 py-2 text-white text-sm font-medium rounded-lg"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Goals list */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {!goalsLoaded ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>Loading...</p>
              ) : goals.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.colors.textMuted }}>No goals yet.</p>
              ) : (
                goals.map(goal => {
                  const progress = Math.round((goal.current / goal.target) * 100);
                  const isComplete = goal.current >= goal.target;
                  return (
                    <div key={goal.id} className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                      {editingGoalId === goal.id ? (
                        <form onSubmit={e => { e.preventDefault(); saveEditGoal(); }} className="space-y-2">
                          <input
                            type="text"
                            value={editingGoalTitle}
                            onChange={e => setEditingGoalTitle(e.target.value)}
                            placeholder="Goal title"
                            autoFocus
                            className="w-full px-2 py-1 rounded border text-sm focus:outline-none"
                            style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editingGoalTarget}
                              onChange={e => setEditingGoalTarget(e.target.value)}
                              placeholder="Target"
                              min="1"
                              className="w-20 px-2 py-1 rounded border text-sm focus:outline-none"
                              style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                            />
                            <input
                              type="text"
                              value={editingGoalUnit}
                              onChange={e => setEditingGoalUnit(e.target.value)}
                              placeholder="Unit"
                              className="flex-1 px-2 py-1 rounded border text-sm focus:outline-none"
                              style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }}
                            />
                            <button type="submit" className="px-2 py-1 text-white text-xs rounded" style={{ backgroundColor: theme.colors.primary }}>
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingGoalId(null)} className="px-2 py-1 text-xs rounded" style={{ color: theme.colors.textMuted }}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-medium cursor-pointer ${isComplete ? 'line-through' : ''}`}
                              style={{ color: isComplete ? theme.colors.textMuted : theme.colors.text }}
                              onDoubleClick={() => startEditGoal(goal)}
                              title="Double-click to edit"
                            >
                              {goal.title}
                            </span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditGoal(goal)} className="text-gray-400 hover:text-blue-500" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDeleteGoal(goal.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateProgress(goal, -1)}
                              disabled={goal.current <= 0}
                              className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold disabled:opacity-30"
                              style={{ backgroundColor: theme.colors.border, color: theme.colors.text }}
                            >
                              -
                            </button>
                            <div className="flex-1">
                              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.border }}>
                                <div
                                  className="h-full transition-all duration-300"
                                  style={{ width: `${progress}%`, backgroundColor: isComplete ? theme.colors.streak : theme.colors.primary }}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpdateProgress(goal, 1)}
                              disabled={goal.current >= goal.target}
                              className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold disabled:opacity-30"
                              style={{ backgroundColor: theme.colors.border, color: theme.colors.text }}
                            >
                              +
                            </button>
                          </div>
                          <p className="text-xs mt-1 text-center" style={{ color: theme.colors.textMuted }}>
                            {goal.current} / {goal.target} {goal.unit} {isComplete && '✓'}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* TFT Analytics Section */}
        <div className="mt-6">
          <TftDashboard />
        </div>
      </main>

      {/* Delete habit confirmation modal */}
      {habitToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg shadow-xl max-w-sm w-full p-6" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>Delete habit?</h2>
            <p className="mb-6 text-sm" style={{ color: theme.colors.textMuted }}>
              Are you sure you want to delete &quot;{habitToDelete.name}&quot;? This will also remove all completion history.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setHabitToDelete(null)} className="px-4 py-2 rounded-lg transition-colors" style={{ color: theme.colors.text }}>
                Cancel
              </button>
              <button
                onClick={() => { handleDeleteHabit(habitToDelete.id); setHabitToDelete(null); }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
