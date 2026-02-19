'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArtCoachTask, ArtCoachProject } from '@/lib/types';
import {
  fetchTaskForDate,
  fetchRecentTasks,
  fetchActiveProjects,
  fetchArtStats,
  completeTask,
  uncompleteTask,
  isPracticeDay,
  toDateString,
} from '@/lib/art-coach';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';

interface ArtCoachProps {
  userId: string;
}

export default function ArtCoach({ userId }: ArtCoachProps) {
  const { theme } = useTheme();
  const supabase = createClient();

  const [todayTask, setTodayTask] = useState<ArtCoachTask | null>(null);
  const [recentTasks, setRecentTasks] = useState<ArtCoachTask[]>([]);
  const [activeProjects, setActiveProjects] = useState<ArtCoachProject[]>([]);
  const [stats, setStats] = useState({ currentStreak: 0, longestStreak: 0, totalCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'challenge'>('normal');
  const [completionNotes, setCompletionNotes] = useState('');
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const today = toDateString(new Date());
  const practiceDay = isPracticeDay(new Date());

  const loadData = useCallback(async () => {
    try {
      const [task, recent, projects, artStats] = await Promise.all([
        fetchTaskForDate(supabase, userId, today),
        fetchRecentTasks(supabase, userId, 7),
        fetchActiveProjects(supabase, userId),
        fetchArtStats(supabase, userId),
      ]);
      setTodayTask(task);
      setRecentTasks(recent);
      setActiveProjects(projects);
      setStats(artStats);
      if (task?.notes) setCompletionNotes(task.notes);
    } catch (err) {
      console.error('Failed to load art coach data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate(isReplacement = false) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/art-coach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          difficulty: isReplacement ? 'easy' : difficulty,
          isReplacement,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate task');
        return;
      }
      setTodayTask(data.task);
      // Refresh projects in case a new one was created
      const projects = await fetchActiveProjects(supabase, userId);
      setActiveProjects(projects);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setGenerating(false);
    }
  }

  async function handleComplete() {
    if (!todayTask) return;
    try {
      await completeTask(supabase, userId, todayTask.id, completionNotes || null, satisfaction);
      setTodayTask({ ...todayTask, completed: true, completed_at: new Date().toISOString(), notes: completionNotes || null });
      // Refresh stats
      const artStats = await fetchArtStats(supabase, userId);
      setStats(artStats);
      const recent = await fetchRecentTasks(supabase, userId, 7);
      setRecentTasks(recent);
      if (todayTask.project_id) {
        const projects = await fetchActiveProjects(supabase, userId);
        setActiveProjects(projects);
      }
      setShowNotes(false);
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  }

  async function handleUncomplete() {
    if (!todayTask) return;
    try {
      await uncompleteTask(supabase, todayTask.id);
      setTodayTask({ ...todayTask, completed: false, completed_at: null });
      const artStats = await fetchArtStats(supabase, userId);
      setStats(artStats);
    } catch (err) {
      console.error('Failed to uncomplete task:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: theme.colors.background }}>
        <header className="max-w-2xl mx-auto mb-6">
          <NavBar />
        </header>
        <div className="flex items-center justify-center py-20">
          <p style={{ color: theme.colors.textMuted }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: theme.colors.background }}>
      <header className="max-w-2xl mx-auto mb-6">
        <NavBar />
      </header>
      <main className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Art Coach</h1>
            <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
              Daily drawing practice for portrait mastery
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            {stats.currentStreak > 0 && (
              <div>
                <span className="text-lg font-bold" style={{ color: theme.colors.streak }}>
                  🔥 {stats.currentStreak}d
                </span>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>streak</p>
              </div>
            )}
            <div>
              <span className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {stats.totalCompleted}
              </span>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>sessions</p>
            </div>
          </div>
        </div>

        {/* Rest Day Banner */}
        {!practiceDay && (
          <section className="rounded-xl p-6 text-center" style={{ backgroundColor: theme.colors.card }}>
            <p className="text-3xl mb-2">🎨</p>
            <h2 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>Rest Day</h2>
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              Take a break today. Your next practice day is Wednesday.
            </p>
            {stats.longestStreak > 0 && (
              <p className="text-xs mt-3" style={{ color: theme.colors.textMuted }}>
                Longest streak: {stats.longestStreak} days
              </p>
            )}
          </section>
        )}

        {/* Today's Task */}
        {practiceDay && (
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
              Today&apos;s Practice
            </h2>

            {!todayTask ? (
              /* Generate Task */
              <div className="space-y-4">
                <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                  Ready to practice? Choose a difficulty and generate today&apos;s assignment.
                </p>
                <div className="flex gap-2">
                  {(['easy', 'normal', 'challenge'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border"
                      style={{
                        backgroundColor: difficulty === d ? theme.colors.primary : 'transparent',
                        color: difficulty === d ? '#fff' : theme.colors.text,
                        borderColor: difficulty === d ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      {d === 'easy' ? 'Easy' : d === 'normal' ? 'Normal' : 'Challenge'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  className="w-full py-3 rounded-lg text-white font-medium transition-opacity"
                  style={{
                    backgroundColor: theme.colors.primary,
                    opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? 'Generating...' : 'Generate Today\'s Task'}
                </button>
                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}
              </div>
            ) : (
              /* Task Display */
              <div className="space-y-4">
                {/* Task Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                      {todayTask.title}
                    </h3>
                    {todayTask.project && (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded mt-1"
                        style={{ backgroundColor: theme.colors.primary + '20', color: theme.colors.primary }}
                      >
                        Project: {todayTask.project.title} ({todayTask.project.completed_sessions + (todayTask.completed ? 0 : 0)}/{todayTask.project.total_sessions})
                      </span>
                    )}
                  </div>
                  {todayTask.completed && (
                    <span className="text-xs px-2 py-1 rounded font-medium flex-shrink-0" style={{ backgroundColor: theme.colors.streak + '20', color: theme.colors.streak }}>
                      Completed ✓
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
                  {todayTask.description}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
                    {todayTask.medium}
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
                    {todayTask.focus_area}
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
                    ~{todayTask.duration_minutes} min
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
                    {todayTask.difficulty}
                  </span>
                </div>

                {todayTask.reference_source && (
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                    Reference: {todayTask.reference_source}
                  </p>
                )}

                {/* Completion Section */}
                {!todayTask.completed ? (
                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                    {!showNotes ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNotes(true)}
                          className="flex-1 py-2 rounded-lg text-white font-medium text-sm"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleGenerate(true)}
                          disabled={generating}
                          className="py-2 px-3 rounded-lg text-sm font-medium border transition-opacity"
                          style={{
                            borderColor: theme.colors.border,
                            color: theme.colors.textMuted,
                            opacity: generating ? 0.6 : 1,
                          }}
                        >
                          {generating ? '...' : 'Too hard today'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={completionNotes}
                          onChange={e => setCompletionNotes(e.target.value)}
                          placeholder="How did it go? Any observations? (optional)"
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                          style={{
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                          }}
                        />
                        {/* Satisfaction Rating */}
                        <div>
                          <p className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>
                            How satisfied? (optional)
                          </p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setSatisfaction(satisfaction === n ? null : n)}
                                className="w-8 h-8 rounded text-sm font-medium transition-colors"
                                style={{
                                  backgroundColor: satisfaction === n ? theme.colors.primary : theme.colors.background,
                                  color: satisfaction === n ? '#fff' : theme.colors.text,
                                  border: `1px solid ${satisfaction === n ? theme.colors.primary : theme.colors.border}`,
                                }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleComplete}
                            className="flex-1 py-2 rounded-lg text-white font-medium text-sm"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            Complete Session
                          </button>
                          <button
                            onClick={() => setShowNotes(false)}
                            className="py-2 px-3 rounded-lg text-sm border"
                            style={{ borderColor: theme.colors.border, color: theme.colors.textMuted }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                    {todayTask.notes && (
                      <p className="text-sm italic mb-2" style={{ color: theme.colors.textMuted }}>
                        &quot;{todayTask.notes}&quot;
                      </p>
                    )}
                    <button
                      onClick={handleUncomplete}
                      className="text-xs underline"
                      style={{ color: theme.colors.textMuted }}
                    >
                      Undo completion
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
              Active Projects
            </h2>
            <div className="space-y-3">
              {activeProjects.map(project => {
                const progress = project.total_sessions > 0
                  ? (project.completed_sessions / project.total_sessions) * 100
                  : 0;
                return (
                  <div key={project.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                        {project.title}
                      </span>
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {project.completed_sessions}/{project.total_sessions}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: theme.colors.primary,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent History */}
        {recentTasks.length > 0 && (
          <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
              Recent Sessions
            </h2>
            <div className="space-y-2">
              {recentTasks.filter(t => t.completed).slice(0, 7).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                      {task.title}
                    </p>
                    <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                      {task.medium} &middot; {task.focus_area} &middot; {task.duration_minutes}min
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: theme.colors.textMuted }}>
                    {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
              {recentTasks.filter(t => t.completed).length === 0 && (
                <p className="text-sm text-center py-2" style={{ color: theme.colors.textMuted }}>
                  No completed sessions yet. Start your first practice!
                </p>
              )}
            </div>
          </section>
        )}

        {/* Stats Footer */}
        {stats.longestStreak > 0 && (
          <p className="text-center text-xs" style={{ color: theme.colors.textMuted }}>
            Longest streak: {stats.longestStreak} practice days
          </p>
        )}
      </main>
    </div>
  );
}
