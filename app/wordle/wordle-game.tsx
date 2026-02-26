'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';
import { ANSWER_WORDS, VALID_WORDS } from './word-list';
import { FUN_WORDS } from './fun-word-list';
import { loadFunValidSet } from './fun-validator';

// ─── Game colors (fixed, independent of theme) ───
const COLORS = {
  correct: '#0d9488',
  present: '#d97706',
  absent:  '#4b5563',
  tileText: '#ffffff',
};

// ─── Types ───
type TileState = 'correct' | 'present' | 'absent' | 'filled' | 'empty';
type GameMode = 'daily' | 'fun';

interface GameState {
  date: string;
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
}

interface FunState {
  guesses: string[];
  status: 'rolling' | 'playing' | 'won' | 'lost';
  wordLength: number;
  target: string;
  dice: { d1: number; d2: number } | null;
}

interface GameStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>;
}

// ─── Date / word helpers ───
function getTodayDateEST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

const EPOCH_MS = new Date('2026-01-01T00:00:00-05:00').getTime();

function getDailyWord(): string {
  const todayStr = getTodayDateEST();
  const todayMs = new Date(todayStr + 'T00:00:00-05:00').getTime();
  const dayIndex = Math.floor((todayMs - EPOCH_MS) / 86400000);
  const idx = ((dayIndex % ANSWER_WORDS.length) + ANSWER_WORDS.length) % ANSWER_WORDS.length;
  return ANSWER_WORDS[idx];
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function pickFunWord(length: number): string {
  const list = FUN_WORDS[length] ?? FUN_WORDS[6];
  return list[Math.floor(Math.random() * list.length)];
}

// ─── Game logic ───
function evaluateGuess(guess: string, target: string): TileState[] {
  const len = target.length;
  const result: TileState[] = Array(len).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const targetUsed = Array(len).fill(false);

  for (let i = 0; i < len; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetUsed[i] = true;
    }
  }
  for (let i = 0; i < len; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < len; j++) {
      if (!targetUsed[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present';
        targetUsed[j] = true;
        break;
      }
    }
  }
  return result;
}

function computeAllEvaluations(guesses: string[], target: string): TileState[][] {
  return guesses.map(g => evaluateGuess(g, target));
}

function getLetterStates(
  guesses: string[],
  evaluations: TileState[][]
): Map<string, TileState> {
  const priority: Partial<Record<TileState, number>> = { correct: 3, present: 2, absent: 1 };
  const map = new Map<string, TileState>();
  guesses.forEach((guess, gi) => {
    guess.split('').forEach((letter, li) => {
      const state = evaluations[gi]?.[li];
      if (!state) return;
      const cur = map.get(letter);
      if (!cur || (priority[state] ?? 0) > (priority[cur] ?? 0)) {
        map.set(letter, state);
      }
    });
  });
  return map;
}

// ─── localStorage helpers ───
const STORAGE_STATE = 'sixle-state';
const STORAGE_STATS = 'sixle-stats';

function defaultState(): GameState {
  return { date: getTodayDateEST(), guesses: [], status: 'playing' };
}

function defaultStats(): GameStats {
  return { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: {} };
}

function loadState(): GameState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_STATE);
    if (raw) {
      const s: GameState = JSON.parse(raw);
      if (s.date === getTodayDateEST()) return s;
    }
  } catch { /* ignore */ }
  return defaultState();
}

function saveState(s: GameState) {
  localStorage.setItem(STORAGE_STATE, JSON.stringify(s));
}

function loadStats(): GameStats {
  if (typeof window === 'undefined') return defaultStats();
  try {
    const raw = localStorage.getItem(STORAGE_STATS);
    if (raw) return { ...defaultStats(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultStats();
}

function saveStats(s: GameStats) {
  localStorage.setItem(STORAGE_STATS, JSON.stringify(s));
}

function updateStats(stats: GameStats, won: boolean, guessCount: number): GameStats {
  const s = { ...stats };
  s.gamesPlayed++;
  if (won) {
    s.wins++;
    s.currentStreak++;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    const key = String(guessCount);
    s.distribution = { ...s.distribution, [key]: (s.distribution[key] ?? 0) + 1 };
  } else {
    s.currentStreak = 0;
  }
  return s;
}

// ─── Die face component ───
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DieFace({ value, isRolling, landed }: { value: number; isRolling: boolean; landed: boolean }) {
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <div
      style={{
        width: 72,
        height: 72,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        border: '2px solid #d1d5db',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: isRolling
          ? 'dice-shake 0.18s linear infinite'
          : landed
          ? 'dice-land 0.35s ease-out'
          : undefined,
        flexShrink: 0,
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#1f2937',
            left: `calc(${x}% - 6px)`,
            top: `calc(${y}% - 6px)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Dice roller component ───
// finalDice: the actual roll result, set by parent the instant Roll is clicked.
// diceAnimating: true for ~900ms while the animation plays (random faces shown).
// fetchingWords: true while the word-list JSON is being downloaded.
// The "Play →" button only appears once both flags are false.
function DiceRoller({
  finalDice,
  diceAnimating,
  fetchingWords,
  onRollStart,
  onPlay,
  theme,
}: {
  finalDice: { d1: number; d2: number } | null;
  diceAnimating: boolean;
  fetchingWords: boolean;
  onRollStart: () => void;
  onPlay: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [animDice, setAnimDice] = useState<{ d1: number; d2: number }>({ d1: 1, d2: 1 });
  const [landed, setLanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drive the random scramble animation while diceAnimating is true.
  useEffect(() => {
    if (diceAnimating) {
      setLanded(false);
      intervalRef.current = setInterval(() => {
        setAnimDice({ d1: rollDie(), d2: rollDie() });
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (finalDice) {
        setAnimDice({ d1: finalDice.d1, d2: finalDice.d2 });
        setLanded(true);
        setTimeout(() => setLanded(false), 400);
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [diceAnimating, finalDice]);

  const hasResult = finalDice !== null;
  const sum = hasResult ? finalDice.d1 + finalDice.d2 : null;
  const showResult = hasResult && !diceAnimating;
  const playReady = showResult && !fetchingWords;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 16px' }}>
      <p style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' }}>
        Roll the dice — the sum determines your word length!
      </p>

      {/* Dice display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <DieFace value={animDice.d1} isRolling={diceAnimating} landed={landed} />
        <span style={{ fontSize: 24, fontWeight: 700, color: theme.colors.textMuted }}>+</span>
        <DieFace value={animDice.d2} isRolling={diceAnimating} landed={landed} />
      </div>

      {/* Sum / word length result */}
      {showResult && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: theme.colors.textMuted }}>
            {finalDice!.d1} + {finalDice!.d2} =&nbsp;
            <span style={{ fontWeight: 800, fontSize: 20, color: theme.colors.text }}>{sum}</span>
          </p>
          <p style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 4 }}>
            Guess a&nbsp;
            <span style={{ fontWeight: 700, color: COLORS.correct }}>{sum}-letter word</span>
          </p>
        </div>
      )}

      {/* Roll button */}
      <button
        onClick={onRollStart}
        disabled={diceAnimating}
        style={{
          padding: '12px 32px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          backgroundColor: diceAnimating ? theme.colors.border : COLORS.correct,
          color: diceAnimating ? theme.colors.textMuted : '#fff',
          border: 'none',
          cursor: diceAnimating ? 'default' : 'pointer',
          transition: 'background-color 0.2s',
          minWidth: 140,
        }}
      >
        {diceAnimating ? 'Rolling…' : hasResult ? 'Re-Roll' : '🎲 Roll Dice'}
      </button>

      {/* Play button (or loading indicator) */}
      {showResult && (
        <button
          onClick={onPlay}
          disabled={!playReady}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 15,
            backgroundColor: playReady ? COLORS.correct : theme.colors.border,
            color: playReady ? '#fff' : theme.colors.textMuted,
            border: 'none',
            cursor: playReady ? 'pointer' : 'default',
            transition: 'background-color 0.2s',
            minWidth: 140,
          }}
        >
          {fetchingWords ? 'Loading words…' : 'Play →'}
        </button>
      )}
    </div>
  );
}

// ─── Tile component ───
interface TileProps {
  letter: string;
  state: TileState;
  isRevealing: boolean;
  revealDelay: number;
  isBouncing: boolean;
  bounceDelay: number;
  isPopping: boolean;
  tileSize: string;
  fontSize: string;
  theme: { text: string; border: string };
}

function Tile({ letter, state, isRevealing, revealDelay, isBouncing, bounceDelay, isPopping, tileSize, fontSize, theme }: TileProps) {
  const [revealed, setRevealed] = useState(
    state === 'correct' || state === 'present' || state === 'absent'
  );
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (state === 'correct' || state === 'present' || state === 'absent') {
      if (!isRevealing) { setRevealed(true); return; }
    }
    if (!isRevealing) return;
    const t1 = setTimeout(() => setClosing(true), revealDelay);
    const t2 = setTimeout(() => { setClosing(false); setRevealed(true); }, revealDelay + 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isRevealing, revealDelay, state]);

  const getBg = () => {
    if (!revealed) return 'transparent';
    if (state === 'correct') return COLORS.correct;
    if (state === 'present') return COLORS.present;
    if (state === 'absent') return COLORS.absent;
    return 'transparent';
  };

  const getBorder = () => {
    if (revealed && (state === 'correct' || state === 'present' || state === 'absent')) return 'none';
    if (letter) return `2px solid ${theme.text}`;
    return `2px solid ${theme.border}`;
  };

  const getAnimation = () => {
    if (isBouncing) return `sixle-bounce 0.4s ease ${bounceDelay}ms both`;
    if (isPopping) return 'sixle-pop 0.1s ease';
    return undefined;
  };

  return (
    <div
      style={{
        width: tileSize,
        height: tileSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        backgroundColor: getBg(),
        border: getBorder(),
        borderRadius: 4,
        color: revealed && (state === 'correct' || state === 'present' || state === 'absent')
          ? COLORS.tileText
          : theme.text,
        transform: closing ? 'scaleY(0)' : 'scaleY(1)',
        transition: isRevealing ? `transform 0.25s ease ${closing ? revealDelay : revealDelay + 250}ms` : 'transform 0.1s ease',
        animation: getAnimation(),
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

// ─── TileGrid component ───
interface TileGridProps {
  guesses: string[];
  evaluations: TileState[][];
  currentInput: string;
  revealingRow: number | null;
  shakeRow: number | null;
  gameStatus: 'playing' | 'won' | 'lost';
  poppingCol: number | null;
  wordLength: number;
  theme: { text: string; border: string };
}

function tileSizing(wordLength: number): { tileSize: string; fontSize: string; gap: number } {
  if (wordLength <= 3) return { tileSize: 'clamp(56px, 18vw, 80px)', fontSize: 'clamp(1.4rem, 5vw, 2rem)', gap: 8 };
  if (wordLength <= 5) return { tileSize: 'clamp(46px, 14vw, 66px)', fontSize: 'clamp(1.2rem, 4vw, 1.7rem)', gap: 7 };
  if (wordLength <= 7) return { tileSize: 'clamp(38px, 11vw, 56px)', fontSize: 'clamp(1rem, 3.2vw, 1.45rem)', gap: 6 };
  if (wordLength <= 9) return { tileSize: 'clamp(32px, 9vw, 46px)', fontSize: 'clamp(0.85rem, 2.7vw, 1.2rem)', gap: 5 };
  return { tileSize: 'clamp(26px, 7.5vw, 38px)', fontSize: 'clamp(0.7rem, 2.2vw, 1rem)', gap: 4 };
}

function TileGrid({ guesses, evaluations, currentInput, revealingRow, shakeRow, gameStatus, poppingCol, wordLength, theme }: TileGridProps) {
  const wonRow = gameStatus === 'won' ? guesses.length - 1 : -1;
  const { tileSize, fontSize, gap } = tileSizing(wordLength);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: 'center' }}>
      {Array(6).fill(null).map((_, rowIdx) => {
        const isSubmitted = rowIdx < guesses.length;
        const isCurrent = rowIdx === guesses.length && gameStatus === 'playing';
        const isShaking = rowIdx === shakeRow;
        const isRevealing = rowIdx === revealingRow;
        const isWinRow = rowIdx === wonRow;

        let letters: string[];
        let states: TileState[];

        if (isSubmitted) {
          letters = guesses[rowIdx].split('');
          states = evaluations[rowIdx] ?? Array(wordLength).fill('absent');
        } else if (isCurrent) {
          letters = [...currentInput.split(''), ...Array(wordLength - currentInput.length).fill('')];
          states = Array(wordLength).fill('empty');
        } else {
          letters = Array(wordLength).fill('');
          states = Array(wordLength).fill('empty');
        }

        return (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              gap,
              animation: isShaking ? 'sixle-shake 0.5s ease-in-out' : undefined,
            }}
          >
            {letters.map((letter, colIdx) => {
              const tileState: TileState = isSubmitted
                ? states[colIdx]
                : letter ? 'filled' : 'empty';

              const isPopping = isCurrent && colIdx === currentInput.length - 1 && poppingCol === colIdx;

              return (
                <Tile
                  key={colIdx}
                  letter={letter}
                  state={tileState}
                  isRevealing={isRevealing}
                  revealDelay={colIdx * 200}
                  isBouncing={isWinRow}
                  bounceDelay={colIdx * 80}
                  isPopping={isPopping}
                  tileSize={tileSize}
                  fontSize={fontSize}
                  theme={theme}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── On-screen keyboard ───
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

interface KeyboardProps {
  letterStates: Map<string, TileState>;
  onKey: (k: string) => void;
  disabled: boolean;
  theme: { text: string; border: string };
}

function OnScreenKeyboard({ letterStates, onKey, disabled, theme }: KeyboardProps) {
  function getKeyStyle(key: string): React.CSSProperties {
    const state = letterStates.get(key);
    const isWide = key === 'ENTER' || key === '⌫';
    const base: React.CSSProperties = {
      height: 58,
      flex: isWide ? '1.5 1 0' : '1 1 0',
      maxWidth: isWide ? 72 : 44,
      minWidth: 0,
      fontSize: isWide ? 11 : 16,
      fontWeight: 700,
      borderRadius: 4,
      border: 'none',
      cursor: disabled ? 'default' : 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.15s',
      color: state && state !== 'empty' && state !== 'filled' ? COLORS.tileText : theme.text,
      backgroundColor: state === 'correct' ? COLORS.correct
        : state === 'present' ? COLORS.present
        : state === 'absent' ? COLORS.absent
        : theme.border,
    };
    return base;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 500, padding: '0 4px' }}>
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {row.map(key => (
            <button
              key={key}
              onPointerDown={e => { e.preventDefault(); if (!disabled) onKey(key); }}
              style={getKeyStyle(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Toast ───
function Toast({ message, theme }: { message: string; theme: { text: string; background: string } }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        padding: '8px 16px',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        backgroundColor: theme.text,
        color: theme.background,
        animation: 'sixle-fadein 0.2s ease',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {message}
    </div>
  );
}

// ─── Next puzzle countdown ───
function NextPuzzleCountdown({ theme }: { theme: { text: string; textMuted: string; border: string } }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const estNow = new Date(estStr);
      const tomorrow = new Date(estNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - estNow.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ textAlign: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: 16, marginTop: 4 }}>
      <p style={{ fontSize: 11, color: theme.textMuted, letterSpacing: '0.05em', marginBottom: 4 }}>
        NEXT SIXLE
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: theme.text }}>
        {timeLeft}
      </p>
    </div>
  );
}

// ─── Share helper ───
function generateShareText(
  guesses: string[],
  evaluations: TileState[][],
  gameStatus: 'playing' | 'won' | 'lost',
  date: string,
): string {
  const count = gameStatus === 'won' ? String(guesses.length) : 'X';
  const grid = evaluations
    .map(row =>
      row.map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join('')
    )
    .join('\n');
  return `Sixle ${date} ${count}/6\n\n${grid}`;
}

// ─── Stats modal ───
interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
  gameStatus: 'playing' | 'won' | 'lost';
  guesses: string[];
  evaluations: TileState[][];
  date: string;
  theme: ReturnType<typeof useTheme>['theme'];
}

function StatsModal({ stats, onClose, gameStatus, guesses, evaluations, date, theme }: StatsModalProps) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const text = generateShareText(guesses, evaluations, gameStatus, date);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  const maxDist = Math.max(...Object.values(stats.distribution), 1);
  const statItems = [
    { label: 'Played', value: stats.gamesPlayed },
    { label: 'Win %', value: stats.gamesPlayed ? Math.round(stats.wins / stats.gamesPlayed * 100) : 0 },
    { label: 'Streak', value: stats.currentStreak },
    { label: 'Best', value: stats.maxStreak },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: theme.colors.card, borderRadius: 16, padding: 24, width: '90%', maxWidth: 380, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text }}>Statistics</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: theme.colors.textMuted, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24, textAlign: 'center' }}>
          {statItems.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.text }}>{value}</div>
              <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: theme.colors.textMuted, letterSpacing: '0.05em', marginBottom: 8 }}>
          GUESS DISTRIBUTION
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {['1','2','3','4','5','6'].map(n => {
            const count = stats.distribution[n] ?? 0;
            const pct = Math.max(8, (count / maxDist) * 100);
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: theme.colors.textMuted, width: 12, textAlign: 'right' }}>{n}</span>
                <div style={{ height: 20, width: `${pct}%`, backgroundColor: COLORS.correct, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, minWidth: 28 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>

        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <>
            <NextPuzzleCountdown theme={theme.colors} />
            <button
              onClick={handleShare}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '12px 0',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                backgroundColor: copied ? '#16a34a' : COLORS.correct,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                letterSpacing: '0.03em',
              }}
            >
              {copied ? '✓ Copied!' : 'Share'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main game component ───
export default function WordleGame() {
  const { theme } = useTheme();

  // ── Daily mode state ──
  const [gameState, setGameState] = useState<GameState>(loadState);
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [currentInput, setCurrentInput] = useState('');
  const [evaluations, setEvaluations] = useState<TileState[][]>(() =>
    computeAllEvaluations(loadState().guesses, getDailyWord())
  );

  // ── Shared UI state ──
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [poppingCol, setPoppingCol] = useState<number | null>(null);

  // ── Mode state ──
  const [mode, setMode] = useState<GameMode>('daily');

  // ── Fun mode state ──
  const [funState, setFunState] = useState<FunState>({
    guesses: [],
    status: 'rolling',
    wordLength: 6,
    target: '',
    dice: null,
  });
  const [funInput, setFunInput] = useState('');
  const [funEvaluations, setFunEvaluations] = useState<TileState[][]>([]);
  // Dice result is generated the instant Roll is clicked (before animation ends).
  const [pendingDice, setPendingDice] = useState<{ d1: number; d2: number } | null>(null);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const [fetchingWords, setFetchingWords] = useState(false);
  const [funValidSet, setFunValidSet] = useState<Set<string> | null>(null);

  const dailyTarget = getDailyWord();

  // ── Derived active game props ──
  const isDaily = mode === 'daily';
  const activeGuesses = isDaily ? gameState.guesses : funState.guesses;
  const activeEvaluations = isDaily ? evaluations : funEvaluations;
  const activeInput = isDaily ? currentInput : funInput;
  const activeStatus: 'playing' | 'won' | 'lost' = isDaily
    ? gameState.status
    : funState.status === 'rolling' ? 'playing' : funState.status as 'playing' | 'won' | 'lost';
  const activeTarget = isDaily ? dailyTarget : funState.target;
  const wordLength = isDaily ? 6 : funState.wordLength;

  const letterStates = getLetterStates(activeGuesses, activeEvaluations);

  // ── Refs for keyboard handler ──
  const stateRef      = useRef(gameState);
  const inputRef      = useRef(currentInput);
  const revealRef     = useRef(revealingRow);
  const evaluationsRef = useRef(evaluations);
  const statsRef      = useRef(stats);
  const modeRef        = useRef(mode);
  const funStateRef    = useRef(funState);
  const funInputRef    = useRef(funInput);
  const funEvalsRef    = useRef(funEvaluations);
  const funValidSetRef = useRef(funValidSet);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { inputRef.current = currentInput; }, [currentInput]);
  useEffect(() => { revealRef.current = revealingRow; }, [revealingRow]);
  useEffect(() => { evaluationsRef.current = evaluations; }, [evaluations]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { funStateRef.current = funState; }, [funState]);
  useEffect(() => { funInputRef.current = funInput; }, [funInput]);
  useEffect(() => { funEvalsRef.current = funEvaluations; }, [funEvaluations]);
  useEffect(() => { funValidSetRef.current = funValidSet; }, [funValidSet]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToastMsg(msg: string, duration = 1500) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }

  function triggerShake(rowIdx: number) {
    setShakeRow(rowIdx);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShakeRow(null), 600);
  }

  // ── Switch mode ──
  function handleSetMode(m: GameMode) {
    setMode(m);
    setRevealingRow(null);
    setShakeRow(null);
    setToast(null);
    setPoppingCol(null);
    if (m === 'fun') {
      setFunState({ guesses: [], status: 'rolling', wordLength: 6, target: '', dice: null });
      setFunInput('');
      setFunEvaluations([]);
      setPendingDice(null);
      setDiceAnimating(false);
      setFetchingWords(false);
      setFunValidSet(null);
    }
  }

  // ── Called when user clicks Roll. Generates dice + starts fetch immediately,
  //    then runs the 900ms animation in parallel. ──
  function handleRollStart() {
    const d1 = rollDie();
    const d2 = rollDie();
    const sum = d1 + d2;
    setPendingDice({ d1, d2 });
    setFunState(prev => ({ ...prev, dice: { d1, d2 } }));
    setFunValidSet(null);

    // Start animation flag; clear after 900ms (matches DiceRoller's interval timing).
    setDiceAnimating(true);
    setTimeout(() => setDiceAnimating(false), 900);

    // Fetch word list concurrently with the animation.
    setFetchingWords(true);
    loadFunValidSet(sum).then(set => {
      setFunValidSet(set);
      setFetchingWords(false);
    });
  }

  // ── Start game after dice roll confirmed ──
  function handleStartFunGame() {
    if (!pendingDice) return;
    const sum = pendingDice.d1 + pendingDice.d2;
    const target = pickFunWord(sum);
    setFunState({
      guesses: [],
      status: 'playing',
      wordLength: sum,
      target,
      dice: pendingDice,
    });
    setFunInput('');
    setFunEvaluations([]);
  }

  // ── Re-roll in fun mode ──
  function handleReroll() {
    setPendingDice(null);
    setDiceAnimating(false);
    setFetchingWords(false);
    setFunValidSet(null);
    setFunState({ guesses: [], status: 'rolling', wordLength: 6, target: '', dice: null });
    setFunInput('');
    setFunEvaluations([]);
    setRevealingRow(null);
    setShakeRow(null);
    setToast(null);
  }

  // ── Process keyboard input ──
  function processKey(key: string) {
    const isD = modeRef.current === 'daily';
    const revealing = revealRef.current;

    if (revealing !== null) return;

    if (isD) {
      const gs = stateRef.current;
      const input = inputRef.current;
      if (gs.status !== 'playing') return;

      if (key === 'ENTER') {
        handleDailySubmit(gs, input);
      } else if (key === '⌫' || key === 'Backspace') {
        setCurrentInput(prev => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && input.length < 6) {
        const newInput = input + key;
        setCurrentInput(newInput);
        setPoppingCol(newInput.length - 1);
        setTimeout(() => setPoppingCol(null), 120);
      }
    } else {
      const fs = funStateRef.current;
      const input = funInputRef.current;
      if (fs.status !== 'playing') return;

      const wl = fs.wordLength;
      if (key === 'ENTER') {
        handleFunSubmit(fs, input);
      } else if (key === '⌫' || key === 'Backspace') {
        setFunInput(prev => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && input.length < wl) {
        const newInput = input + key;
        setFunInput(newInput);
        setPoppingCol(newInput.length - 1);
        setTimeout(() => setPoppingCol(null), 120);
      }
    }
  }

  function handleDailySubmit(gs: GameState, input: string) {
    if (input.length !== 6) {
      showToastMsg('Not enough letters');
      triggerShake(gs.guesses.length);
      return;
    }
    if (gs.guesses.includes(input)) {
      showToastMsg('Already guessed');
      triggerShake(gs.guesses.length);
      return;
    }
    if (!VALID_WORDS.has(input)) {
      showToastMsg('Not in word list');
      triggerShake(gs.guesses.length);
      return;
    }

    const rowIdx = gs.guesses.length;
    const newGuesses = [...gs.guesses, input];
    const newEval = evaluateGuess(input, dailyTarget);
    const won = input === dailyTarget;
    const lost = !won && newGuesses.length >= 6;
    const newStatus = won ? 'won' : lost ? 'lost' : 'playing';

    const newState: GameState = { ...gs, guesses: newGuesses, status: newStatus };
    setGameState(newState);
    saveState(newState);

    setRevealingRow(rowIdx);
    setCurrentInput('');
    setEvaluations(prev => [...prev, newEval]);

    const REVEAL_DURATION = 5 * 200 + 500 + 50;
    setTimeout(() => {
      setRevealingRow(null);
      if (won || lost) {
        const updatedStats = updateStats(statsRef.current, won, newGuesses.length);
        setStats(updatedStats);
        saveStats(updatedStats);
        if (won) {
          const msgs = ['Brilliant!', 'Amazing!', 'Splendid!', 'Great!', 'Good', 'Phew!'];
          showToastMsg(msgs[newGuesses.length - 1] ?? 'Nice!');
        } else {
          showToastMsg(`The word was ${dailyTarget}`, 4000);
        }
        setTimeout(() => setShowStats(true), 1600);
      }
    }, REVEAL_DURATION);
  }

  function handleFunSubmit(fs: FunState, input: string) {
    const wl = fs.wordLength;
    if (input.length !== wl) {
      showToastMsg('Not enough letters');
      triggerShake(fs.guesses.length);
      return;
    }
    if (fs.guesses.includes(input)) {
      showToastMsg('Already guessed');
      triggerShake(fs.guesses.length);
      return;
    }
    // Prefer the full ENABLE1 set (loaded async); if somehow absent, skip validation.
    const validSet = funValidSetRef.current;
    if (validSet && !validSet.has(input)) {
      showToastMsg('Not in word list');
      triggerShake(fs.guesses.length);
      return;
    }

    const rowIdx = fs.guesses.length;
    const newGuesses = [...fs.guesses, input];
    const newEval = evaluateGuess(input, fs.target);
    const won = input === fs.target;
    const lost = !won && newGuesses.length >= 6;
    const newStatus: FunState['status'] = won ? 'won' : lost ? 'lost' : 'playing';

    setFunState(prev => ({ ...prev, guesses: newGuesses, status: newStatus }));
    setRevealingRow(rowIdx);
    setFunInput('');
    setFunEvaluations(prev => [...prev, newEval]);

    const lastTileIdx = wl - 1;
    const REVEAL_DURATION = lastTileIdx * 200 + 500 + 50;
    setTimeout(() => {
      setRevealingRow(null);
      if (won || lost) {
        if (won) {
          const msgs = ['Brilliant!', 'Amazing!', 'Splendid!', 'Great!', 'Good', 'Phew!'];
          showToastMsg(msgs[newGuesses.length - 1] ?? 'Nice!');
        } else {
          showToastMsg(`The word was ${fs.target}`, 4000);
        }
      }
    }, REVEAL_DURATION);
  }

  // ── Physical keyboard ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Enter') processKey('ENTER');
      else if (e.key === 'Backspace') processKey('⌫');
      else if (/^[a-zA-Z]$/.test(e.key)) processKey(e.key.toUpperCase());
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDisabled = activeStatus !== 'playing' || revealingRow !== null
    || (mode === 'fun' && funState.status === 'rolling');

  const showRollingPhase = mode === 'fun' && funState.status === 'rolling';
  const showGameOver = mode === 'fun' && (funState.status === 'won' || funState.status === 'lost');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background, paddingBottom: 32 }}>
      {toast && <Toast message={toast} theme={theme.colors} />}

      {showStats && mode === 'daily' && (
        <StatsModal
          stats={stats}
          onClose={() => setShowStats(false)}
          gameStatus={gameState.status}
          guesses={gameState.guesses}
          evaluations={evaluations}
          date={gameState.date}
          theme={theme}
        />
      )}

      {/* NavBar */}
      <header style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px 0' }}>
        <NavBar />
      </header>

      {/* Game header */}
      <div
        style={{
          maxWidth: 512,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', color: theme.colors.text, lineHeight: 1 }}>
            Sixle
          </h1>
          <p style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
            {isDaily ? '6 letters · 6 tries' : `${wordLength} letters · 6 tries · fun mode`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${theme.colors.border}` }}>
            <button
              onClick={() => handleSetMode('daily')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isDaily ? COLORS.correct : theme.colors.card,
                color: isDaily ? '#fff' : theme.colors.textMuted,
                transition: 'background-color 0.2s',
              }}
            >
              Daily
            </button>
            <button
              onClick={() => handleSetMode('fun')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: !isDaily ? COLORS.correct : theme.colors.card,
                color: !isDaily ? '#fff' : theme.colors.textMuted,
                transition: 'background-color 0.2s',
              }}
            >
              🎲 Fun
            </button>
          </div>

          {/* Stats button (daily only) */}
          {isDaily && (
            <button
              onClick={() => setShowStats(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: theme.colors.textMuted, borderRadius: 8 }}
              aria-label="Statistics"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 24, paddingLeft: 8, paddingRight: 8 }}>

        {/* Fun mode — rolling phase */}
        {showRollingPhase && (
          <DiceRoller
            finalDice={pendingDice}
            diceAnimating={diceAnimating}
            fetchingWords={fetchingWords}
            onRollStart={handleRollStart}
            onPlay={handleStartFunGame}
            theme={theme}
          />
        )}

        {/* Game board (daily always, fun after game starts) */}
        {(!showRollingPhase) && (
          <>
            <TileGrid
              guesses={activeGuesses}
              evaluations={activeEvaluations}
              currentInput={activeInput}
              revealingRow={revealingRow}
              shakeRow={shakeRow}
              gameStatus={activeStatus}
              poppingCol={poppingCol}
              wordLength={wordLength}
              theme={theme.colors}
            />

            <OnScreenKeyboard
              letterStates={letterStates}
              onKey={key => processKey(key)}
              disabled={isDisabled}
              theme={theme.colors}
            />

            {/* Daily: view stats button */}
            {isDaily && gameState.status !== 'playing' && (
              <button
                onClick={() => setShowStats(true)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  backgroundColor: COLORS.correct,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                View Stats
              </button>
            )}

            {/* Fun mode: game over — show roll again */}
            {showGameOver && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <p style={{ fontSize: 14, color: theme.colors.textMuted }}>
                  {funState.status === 'won'
                    ? `You got it in ${funState.guesses.length}!`
                    : `The word was ${funState.target}`}
                </p>
                <button
                  onClick={handleReroll}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    backgroundColor: COLORS.correct,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  🎲 Roll Again
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
