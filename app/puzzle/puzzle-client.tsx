'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';
import { HabitWithStatus, UserPuzzle } from '@/lib/types';
import { fetchHabitsForDate, toggleCompletion, togglePause, toDateString } from '@/lib/habits';
import {
  fetchOrCreatePuzzle,
  applyMissedDeductions,
  revealRandomTiles,
  removeRandomTiles,
  updatePuzzleTiles,
  completePuzzle,
  puzzleProgress,
  TILES_PER_HABIT,
} from '@/lib/puzzle';
import { getPainting, checkGuess } from '@/lib/paintings';

interface Props { userId: string; }

const GRID = 10; // 10×10
const TOTAL_TILES = GRID * GRID;

export default function PuzzleClient({ userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { theme } = useTheme();

  // ── Habits ──────────────────────────────────────────────────────────────────
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const today = toDateString(new Date());

  useEffect(() => {
    fetchHabitsForDate(supabase, userId, today)
      .then(data => { setHabits(data); setHabitsLoading(false); })
      .catch(() => setHabitsLoading(false));
  }, [supabase, userId, today]);

  // ── Puzzle ──────────────────────────────────────────────────────────────────
  const [puzzle, setPuzzle] = useState<UserPuzzle | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [puzzleLoading, setPuzzleLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [justRevealed, setJustRevealed] = useState<number[]>([]);
  const [justRemoved, setJustRemoved] = useState<number[]>([]);

  // ── Guess ───────────────────────────────────────────────────────────────────
  const [guess, setGuess] = useState('');
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // Load puzzle on mount
  useEffect(() => {
    async function load() {
      try {
        let p = await fetchOrCreatePuzzle(supabase, userId);
        const updated = await applyMissedDeductions(supabase, userId, p);
        if (updated !== null) {
          p = { ...p, revealed_tiles: updated };
          if (updated.length < p.revealed_tiles.length) {
            showToast(`Missed habits removed ${p.revealed_tiles.length - updated.length} tiles`);
          }
        }
        setPuzzle(p);
        setRevealedTiles(p.revealed_tiles);
      } catch (err) {
        console.error('Failed to load puzzle:', err);
      } finally {
        setPuzzleLoading(false);
      }
    }
    load();
  }, [supabase, userId]);

  // ── Habit toggle (also updates puzzle) ──────────────────────────────────────
  async function handleToggle(habit: HabitWithStatus) {
    if (habit.is_paused) return;
    const wasCompleted = habit.completed;

    // Optimistic habit update
    setHabits(prev => prev.map(h =>
      h.id !== habit.id ? h : {
        ...h,
        completed: !wasCompleted,
        completedAt: !wasCompleted ? new Date().toISOString() : null,
        currentStreak: !wasCompleted ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
      }
    ));

    try {
      await toggleCompletion(supabase, userId, habit.id, today, wasCompleted);
    } catch {
      setHabits(prev => prev.map(h => h.id === habit.id ? habit : h));
      return;
    }

    // Update puzzle tiles
    if (!puzzle) return;
    const newTiles = wasCompleted
      ? removeRandomTiles(revealedTiles, TILES_PER_HABIT)
      : revealRandomTiles(revealedTiles, TILES_PER_HABIT);

    // Animate newly changed tiles
    if (!wasCompleted) {
      const added = newTiles.filter(t => !revealedTiles.includes(t));
      setJustRevealed(added);
      setTimeout(() => setJustRevealed([]), 600);
    } else {
      const removed = revealedTiles.filter(t => !newTiles.includes(t));
      setJustRemoved(removed);
      setTimeout(() => setJustRemoved([]), 600);
    }

    setRevealedTiles(newTiles);

    try {
      await updatePuzzleTiles(supabase, puzzle.id, newTiles);
    } catch (err) {
      console.error('Failed to update puzzle tiles:', err);
    }

    // Check for full reveal
    if (newTiles.length >= TOTAL_TILES) {
      setShowAnswer(true);
      showToast('🎉 Puzzle complete! Starting a new painting…');
      setTimeout(async () => {
        try {
          const next = await completePuzzle(supabase, userId, 'completed');
          setPuzzle(next);
          setRevealedTiles([]);
          setShowAnswer(false);
        } catch (err) { console.error(err); }
      }, 3000);
    }
  }

  async function handlePauseToggle(habit: HabitWithStatus) {
    const prev = habits;
    setHabits(h => h.map(item =>
      item.id === habit.id ? { ...item, is_paused: !item.is_paused } : item
    ));
    try {
      await togglePause(supabase, habit.id, habit.is_paused);
    } catch {
      setHabits(prev);
    }
  }

  // ── Guess submission ─────────────────────────────────────────────────────────
  async function handleGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!puzzle || !guess.trim()) return;

    const correct = checkGuess(guess.trim(), puzzle.painting_id);
    setGuessResult(correct ? 'correct' : 'wrong');

    if (correct) {
      showToast('🎨 Correct! Starting a new painting…');
      setTimeout(async () => {
        try {
          const next = await completePuzzle(supabase, userId, 'guessed');
          setPuzzle(next);
          setRevealedTiles([]);
          setGuess('');
          setGuessResult(null);
          setShowAnswer(false);
        } catch (err) { console.error(err); }
      }, 2000);
    } else {
      setTimeout(() => setGuessResult(null), 1500);
    }
  }

  // ── Debug helpers ─────────────────────────────────────────────────────────────
  async function debugReveal(count: number) {
    if (!puzzle) return;
    const newTiles = count >= TOTAL_TILES
      ? Array.from({ length: TOTAL_TILES }, (_, i) => i)
      : revealRandomTiles(revealedTiles, count);
    setRevealedTiles(newTiles);
    await updatePuzzleTiles(supabase, puzzle.id, newTiles);
  }

  async function debugRemove(count: number) {
    if (!puzzle) return;
    const newTiles = removeRandomTiles(revealedTiles, count);
    setRevealedTiles(newTiles);
    await updatePuzzleTiles(supabase, puzzle.id, newTiles);
  }

  async function debugReset() {
    if (!puzzle) return;
    setRevealedTiles([]);
    await updatePuzzleTiles(supabase, puzzle.id, []);
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const painting = puzzle ? getPainting(puzzle.painting_id) : null;
  const progress = puzzleProgress(revealedTiles);
  const activeHabits = habits.filter(h => !h.is_paused);
  const completedToday = activeHabits.filter(h => h.completed).length;
  const isDev = process.env.NODE_ENV === 'development';
  const [debugUnlocked, setDebugUnlocked] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background, color: theme.colors.text }}>
      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${theme.colors.border}`, padding: '12px 24px' }}>
        <NavBar />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: theme.colors.primary, color: '#fff',
          padding: '10px 20px', borderRadius: 8, zIndex: 1000,
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Puzzle</h1>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* ── LEFT: Puzzle grid ── */}
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: theme.colors.textMuted }}>
                {progress}% revealed
              </span>
              <div style={{
                height: 6, flex: 1, margin: '0 12px',
                backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  backgroundColor: theme.colors.primary, borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: 13, color: theme.colors.textMuted }}>{revealedTiles.length}/{TOTAL_TILES}</span>
            </div>

            {/* Grid */}
            {puzzleLoading ? (
              <div style={{ width: '100%', aspectRatio: '1', backgroundColor: theme.colors.border, borderRadius: 8 }} />
            ) : (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                {/* Painting underneath */}
                {painting && (
                  <div
                    style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                      backgroundImage: `url("/api/image-proxy?url=${encodeURIComponent(painting.imageUrl)}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Hidden img used only to detect load/error */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(painting.imageUrl)}`}
                      alt=""
                      style={{ display: 'none' }}
                      onLoad={() => setImgError(false)}
                      onError={() => setImgError(true)}
                    />
                  </div>
                )}
                {/* Tile overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID}, 1fr)`,
                }}>
                  {Array.from({ length: TOTAL_TILES }, (_, i) => {
                    const isRevealed = revealedTiles.includes(i);
                    const isNew = justRevealed.includes(i);
                    const isGone = justRemoved.includes(i);
                    return (
                      <div
                        key={i}
                        style={{
                          backgroundColor: isRevealed ? 'transparent' : '#111827',
                          transition: isNew
                            ? 'background-color 0.5s ease'
                            : isGone
                            ? 'background-color 0.3s ease'
                            : undefined,
                          opacity: isGone ? 0 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image load error — shown below grid so tile overlay doesn't block clicks */}
            {imgError && painting && (
              <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Image failed to load</p>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>Open this link in a new tab to diagnose:</p>
                <a
                  href={`/api/image-proxy?url=${encodeURIComponent(painting.imageUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: '#2563eb', wordBreak: 'break-all' }}
                >
                  /api/image-proxy?url={encodeURIComponent(painting.imageUrl).slice(0, 60)}… ↗
                </a>
              </div>
            )}

            {/* Reveal hint when fully complete */}
            {showAnswer && painting && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: theme.colors.primary + '20', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: theme.colors.primary, margin: 0 }}>
                  🎉 {painting.title}
                </p>
                <p style={{ fontSize: 13, color: theme.colors.textMuted, margin: '4px 0 0' }}>
                  {painting.artist}, {painting.year}
                </p>
              </div>
            )}

            {/* Guess form */}
            {!showAnswer && puzzle?.status === 'active' && (
              <form onSubmit={handleGuess} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <input
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  placeholder="Guess the painting…"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${guessResult === 'wrong' ? '#ef4444' : guessResult === 'correct' ? '#22c55e' : theme.colors.border}`,
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text, fontSize: 14, outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                    backgroundColor: theme.colors.primary, color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  Guess
                </button>
              </form>
            )}
            {guessResult === 'wrong' && (
              <p style={{ marginTop: 6, fontSize: 13, color: '#ef4444' }}>Not quite — keep trying!</p>
            )}

            {/* Debug panel */}
            {isDev && !debugUnlocked && (
              <button
                onClick={() => {
                  if (window.confirm('Open debug panel? This lets you manipulate puzzle progress.')) {
                    setDebugUnlocked(true);
                  }
                }}
                style={{
                  marginTop: 24, padding: '6px 14px', fontSize: 12, borderRadius: 6,
                  border: '1px dashed #f97316', backgroundColor: 'transparent',
                  color: '#f97316', cursor: 'pointer', display: 'block',
                }}
              >
                🔧 Debug
              </button>
            )}
            {isDev && debugUnlocked && (
              <div style={{
                marginTop: 24, padding: 14, border: '1px dashed #f97316',
                borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f97316' }}>🔧 Debug</p>
                  <button
                    onClick={() => setDebugUnlocked(false)}
                    style={{ fontSize: 11, background: 'none', border: 'none', color: theme.colors.textMuted, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['+ 2 tiles', () => debugReveal(2)], ['+ 20 tiles', () => debugReveal(20)], ['Reveal All', () => debugReveal(TOTAL_TILES)], ['− 2 tiles', () => debugRemove(2)], ['Reset', debugReset]].map(([label, fn]) => (
                    <button
                      key={label as string}
                      onClick={fn as () => void}
                      style={{
                        padding: '4px 10px', fontSize: 12, borderRadius: 6,
                        border: '1px solid #f97316', backgroundColor: 'transparent',
                        color: '#f97316', cursor: 'pointer',
                      }}
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
                {painting && (
                  <p style={{ margin: 0, fontSize: 11, color: theme.colors.textMuted }}>
                    Current: {painting.title} ({puzzle?.painting_id})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Habits ── */}
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Today&apos;s Habits</h2>
              <span style={{ fontSize: 13, color: theme.colors.textMuted }}>
                {completedToday}/{activeHabits.length} done
              </span>
            </div>

            {habitsLoading ? (
              <p style={{ color: theme.colors.textMuted, fontSize: 14 }}>Loading…</p>
            ) : habits.length === 0 ? (
              <p style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                No habits yet. Add some on the Dashboard.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      backgroundColor: theme.colors.card,
                      border: `1px solid ${theme.colors.border}`,
                      opacity: habit.is_paused ? 0.55 : 1,
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(habit)}
                      disabled={habit.is_paused}
                      style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${habit.completed ? theme.colors.primary : theme.colors.border}`,
                        backgroundColor: habit.completed ? theme.colors.primary : 'transparent',
                        cursor: habit.is_paused ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {habit.completed && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Name */}
                    <span style={{
                      flex: 1, fontSize: 14,
                      textDecoration: habit.completed ? 'line-through' : 'none',
                      color: habit.completed ? theme.colors.textMuted : theme.colors.text,
                    }}>
                      {habit.name}
                    </span>

                    {/* Paused badge */}
                    {habit.is_paused && (
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 10,
                        backgroundColor: theme.colors.border, color: theme.colors.textMuted,
                        fontWeight: 600,
                      }}>
                        Paused
                      </span>
                    )}

                    {/* Pause/resume button */}
                    <button
                      onClick={() => handlePauseToggle(habit)}
                      title={habit.is_paused ? 'Resume habit' : 'Pause habit'}
                      style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: 'transparent', color: theme.colors.textMuted, cursor: 'pointer',
                      }}
                    >
                      {habit.is_paused ? '▶ Resume' : '⏸ Pause'}
                    </button>

                    {/* Streak */}
                    {habit.currentStreak > 0 && !habit.is_paused && (
                      <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
                        🔥{habit.currentStreak}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tile legend */}
            <div style={{ marginTop: 24, padding: 12, borderRadius: 8, border: `1px solid ${theme.colors.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: theme.colors.textMuted }}>
                HOW IT WORKS
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: theme.colors.text }}>
                ✅ Complete a habit → <strong>+{TILES_PER_HABIT} tiles</strong> revealed
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: theme.colors.text }}>
                ❌ Miss a habit → <strong>−{TILES_PER_HABIT} tiles</strong> removed
              </p>
              <p style={{ margin: 0, fontSize: 13, color: theme.colors.text }}>
                🎨 Reveal 100% or guess correctly to finish!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
