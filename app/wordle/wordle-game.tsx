'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';
import { ANSWER_WORDS, VALID_WORDS } from './word-list';

// ─── Game colors (fixed, independent of theme) ───
const COLORS = {
  correct: '#0d9488',
  present: '#d97706',
  absent:  '#4b5563',
  tileText: '#ffffff',
};

// ─── Types ───
type TileState = 'correct' | 'present' | 'absent' | 'filled' | 'empty';

interface GameState {
  date: string;
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
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

// ─── Game logic ───
function evaluateGuess(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(6).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const targetUsed = Array(6).fill(false);

  // Pass 1: correct positions
  for (let i = 0; i < 6; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetUsed[i] = true;
    }
  }
  // Pass 2: present letters
  for (let i = 0; i < 6; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 6; j++) {
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

// ─── Tile component ───
interface TileProps {
  letter: string;
  state: TileState;
  isRevealing: boolean;
  revealDelay: number;
  isBouncing: boolean;
  bounceDelay: number;
  isPopping: boolean;
  theme: { text: string; border: string };
}

function Tile({ letter, state, isRevealing, revealDelay, isBouncing, bounceDelay, isPopping, theme }: TileProps) {
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

  const tileSize = 'clamp(42px, 13vw, 62px)';
  const fontSize = 'clamp(1.1rem, 3.5vw, 1.6rem)';

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
  gameStatus: GameState['status'];
  poppingCol: number | null;
  theme: { text: string; border: string };
}

function TileGrid({ guesses, evaluations, currentInput, revealingRow, shakeRow, gameStatus, poppingCol, theme }: TileGridProps) {
  const wonRow = gameStatus === 'won' ? guesses.length - 1 : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
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
          states = evaluations[rowIdx] ?? Array(6).fill('absent');
        } else if (isCurrent) {
          letters = [...currentInput.split(''), ...Array(6 - currentInput.length).fill('')];
          states = Array(6).fill('empty');
        } else {
          letters = Array(6).fill('');
          states = Array(6).fill('empty');
        }

        return (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              gap: 6,
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

// ─── Stats modal ───
interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
  gameStatus: GameState['status'];
  theme: ReturnType<typeof useTheme>['theme'];
}

function StatsModal({ stats, onClose, gameStatus, theme }: StatsModalProps) {
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text }}>Statistics</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: theme.colors.textMuted, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24, textAlign: 'center' }}>
          {statItems.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.text }}>{value}</div>
              <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Distribution */}
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

        {/* Countdown if game is over */}
        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <NextPuzzleCountdown theme={theme.colors} />
        )}
      </div>
    </div>
  );
}

// ─── Main game component ───
export default function WordleGame() {
  const { theme } = useTheme();

  const [gameState, setGameState] = useState<GameState>(loadState);
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [currentInput, setCurrentInput] = useState('');
  const [evaluations, setEvaluations] = useState<TileState[][]>(() =>
    computeAllEvaluations(loadState().guesses, getDailyWord())
  );
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [poppingCol, setPoppingCol] = useState<number | null>(null);

  const target = getDailyWord();

  const letterStates = getLetterStates(gameState.guesses, evaluations);

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

  const handleKey = useCallback((key: string) => {
    setGameState(gs => {
      if (gs.status !== 'playing') return gs;
      return gs;
    });
    setRevealingRow(rv => {
      if (rv !== null) return rv; // block input during reveal
      return rv;
    });
  }, []);

  // Use refs to always have fresh state in the keyboard listener
  const stateRef = useRef(gameState);
  const inputRef = useRef(currentInput);
  const revealRef = useRef(revealingRow);
  const evaluationsRef = useRef(evaluations);
  const statsRef = useRef(stats);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { inputRef.current = currentInput; }, [currentInput]);
  useEffect(() => { revealRef.current = revealingRow; }, [revealingRow]);
  useEffect(() => { evaluationsRef.current = evaluations; }, [evaluations]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  function processKey(key: string) {
    const gs = stateRef.current;
    const input = inputRef.current;
    const revealing = revealRef.current;

    if (gs.status !== 'playing') return;
    if (revealing !== null) return;

    if (key === 'ENTER') {
      handleSubmit(gs, input);
    } else if (key === '⌫' || key === 'Backspace') {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && input.length < 6) {
      const newInput = input + key;
      setCurrentInput(newInput);
      // Trigger pop on the newly added tile
      const newCol = newInput.length - 1;
      setPoppingCol(newCol);
      setTimeout(() => setPoppingCol(null), 120);
    }
  }

  function handleSubmit(gs: GameState, input: string) {
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
    const newEval = evaluateGuess(input, target);
    const won = input === target;
    const lost = !won && newGuesses.length >= 6;
    const newStatus = won ? 'won' : lost ? 'lost' : 'playing';

    // Update guesses immediately so TileGrid renders the row as submitted during the reveal
    const newState: GameState = { ...gs, guesses: newGuesses, status: newStatus };
    setGameState(newState);
    saveState(newState);

    // Start reveal
    setRevealingRow(rowIdx);
    setCurrentInput('');
    setEvaluations(prev => [...prev, newEval]);

    const REVEAL_DURATION = 5 * 200 + 500 + 50; // 5 staggered tiles + last tile flip + buffer

    setTimeout(() => {
      setRevealingRow(null);

      if (won || lost) {
        const currentStats = statsRef.current;
        const updatedStats = updateStats(currentStats, won, newGuesses.length);
        setStats(updatedStats);
        saveStats(updatedStats);

        if (won) {
          const msgs = ['Brilliant!', 'Amazing!', 'Splendid!', 'Great!', 'Good', 'Phew!'];
          showToastMsg(msgs[newGuesses.length - 1] ?? 'Nice!');
        } else {
          showToastMsg(`The word was ${target}`, 4000);
        }
        setTimeout(() => setShowStats(true), 1600);
      }
    }, REVEAL_DURATION);
  }

  // Physical keyboard
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

  const isDisabled = gameState.status !== 'playing' || revealingRow !== null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background, paddingBottom: 32 }}>
      {/* Toast */}
      {toast && <Toast message={toast} theme={theme.colors} />}

      {/* Stats modal */}
      {showStats && (
        <StatsModal
          stats={stats}
          onClose={() => setShowStats(false)}
          gameStatus={gameState.status}
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
            6 letters · 6 tries
          </p>
        </div>
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
      </div>

      {/* Tile grid */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 24, paddingLeft: 8, paddingRight: 8 }}>
        <TileGrid
          guesses={gameState.guesses}
          evaluations={evaluations}
          currentInput={currentInput}
          revealingRow={revealingRow}
          shakeRow={shakeRow}
          gameStatus={gameState.status}
          poppingCol={poppingCol}
          theme={theme.colors}
        />

        {/* On-screen keyboard */}
        <OnScreenKeyboard
          letterStates={letterStates}
          onKey={key => processKey(key)}
          disabled={isDisabled}
          theme={theme.colors}
        />

        {/* "Come back tomorrow" if game is over */}
        {gameState.status !== 'playing' && (
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
      </main>
    </div>
  );
}
