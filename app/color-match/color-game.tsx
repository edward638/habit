'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ColorMatchScore } from '@/lib/types';
import { RGB, rgbToHex, calculateScore, generateRandomColor } from '@/lib/color-utils';
import { fetchColorMatchScores, addColorMatchScore, computeColorMatchStats } from '@/lib/color-match';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';
import { DiscPicker, ClassicPicker, HarmonyPicker, ValuePicker } from './color-pickers';

interface ColorGameProps {
  userId: string;
}

type GameState = 'idle' | 'playing' | 'testing' | 'submitted';
type PickerMode = 'disc' | 'classic' | 'harmony' | 'value';

function formatTimeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function ColorGame({ userId }: ColorGameProps) {
  const { theme } = useTheme();
  const supabase = useMemo(() => createClient(), []);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [targetColor, setTargetColor] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [inputColor, setInputColor] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [pickerMode, setPickerMode] = useState<PickerMode>('classic');
  const [scores, setScores] = useState<ColorMatchScore[]>([]);
  const [lastResult, setLastResult] = useState<{ score: number; deltaE: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scoreRevealed, setScoreRevealed] = useState(false);

  const stats = useMemo(() => computeColorMatchStats(scores), [scores]);

  // Load scores
  const loadScores = useCallback(async () => {
    try {
      const data = await fetchColorMatchScores(supabase, userId, 50);
      setScores(data);
    } catch (err) {
      console.error('Failed to load scores:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => { loadScores(); }, [loadScores]);

  function startNewRound() {
    setTargetColor(generateRandomColor());
    setInputColor({ r: 128, g: 128, b: 128 });
    setLastResult(null);
    setScoreRevealed(false);
    setGameState('playing');
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = calculateScore(targetColor, inputColor);
      setLastResult(result);
      const saved = await addColorMatchScore(
        supabase, userId, rgbToHex(targetColor), rgbToHex(inputColor), result.score, result.deltaE
      );
      setScores(prev => [saved, ...prev]);
      setGameState('submitted');
      setTimeout(() => setScoreRevealed(true), 100);
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function scoreColor(score: number): string {
    if (score >= 90) return theme.colors.streak;
    if (score >= 70) return theme.colors.primary;
    return theme.colors.text;
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: theme.colors.background }}>
      <header className="max-w-2xl mx-auto mb-6">
        <NavBar />
      </header>

      <main className="max-w-2xl mx-auto space-y-6">
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Color Match</h1>
            <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
              Match the target color as closely as you can
            </p>
          </div>
          {stats.totalAttempts > 0 && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-lg font-bold" style={{ color: theme.colors.primary }}>{stats.averageScore}</span>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>avg</p>
              </div>
              <div>
                <span className="text-lg font-bold" style={{ color: theme.colors.streak }}>{stats.bestScore}</span>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>best</p>
              </div>
            </div>
          )}
        </div>

        {/* Game Area */}
        <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
          {/* IDLE */}
          {gameState === 'idle' && (
            <div className="text-center py-8">
              <p className="text-lg mb-4" style={{ color: theme.colors.text }}>
                Ready to test your color perception?
              </p>
              <button
                onClick={startNewRound}
                className="px-6 py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Start Game
              </button>
            </div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <div className="space-y-6">
              {/* Target + current pick side by side */}
              <div className="flex justify-center gap-20">
                <div className="text-center">
                  <p className="text-xs mb-2 font-medium" style={{ color: theme.colors.textMuted }}>Target</p>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 140, height: 140, backgroundColor: rgbToHex(targetColor) }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs mb-2 font-medium" style={{ color: theme.colors.textMuted }}>Your Pick</p>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 140, height: 140, backgroundColor: rgbToHex(inputColor) }}
                  />
                </div>
              </div>

              {/* Picker mode tabs */}
              <div className="flex gap-1 justify-center">
                {(['disc', 'classic', 'harmony', 'value'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPickerMode(mode)}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: pickerMode === mode ? theme.colors.primary + '20' : 'transparent',
                      color: pickerMode === mode ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: pickerMode === mode ? 600 : 400,
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Active picker */}
              <div className="flex justify-center">
                {pickerMode === 'classic' && <ClassicPicker color={inputColor} onChange={setInputColor} />}
                {pickerMode === 'disc' && <DiscPicker color={inputColor} onChange={setInputColor} />}
                {pickerMode === 'harmony' && <HarmonyPicker color={inputColor} onChange={setInputColor} />}
                {pickerMode === 'value' && <ValuePicker color={inputColor} onChange={setInputColor} />}
              </div>

              {/* Test button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setGameState('testing')}
                  className="px-6 py-2 rounded-lg font-medium text-white transition-colors"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Test Match
                </button>
              </div>
            </div>
          )}

          {/* TESTING */}
          {gameState === 'testing' && (
            <div className="space-y-6 text-center">
              <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>
                Compare your pick to the target
              </p>

              <div className="flex justify-center gap-20">
                <div>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 160, height: 160, backgroundColor: rgbToHex(targetColor) }}
                  />
                  <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>Target</p>
                </div>
                <div>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 160, height: 160, backgroundColor: rgbToHex(inputColor) }}
                  />
                  <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>Your Pick</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setGameState('playing')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted }}
                >
                  Go Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: theme.colors.primary, opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {/* SUBMITTED */}
          {gameState === 'submitted' && lastResult && (
            <div className="space-y-6 text-center">
              <div
                style={{
                  transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  transform: scoreRevealed ? 'scale(1)' : 'scale(0.5)',
                  opacity: scoreRevealed ? 1 : 0,
                }}
              >
                <p className="text-5xl font-bold" style={{ color: scoreColor(lastResult.score) }}>
                  {lastResult.score}
                </p>
                <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
                  out of 100
                </p>
              </div>

              <div className="flex justify-center gap-20">
                <div>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 148, height: 148, backgroundColor: rgbToHex(targetColor) }}
                  />
                  <p className="text-xs mt-2 font-mono" style={{ color: theme.colors.text }}>
                    {rgbToHex(targetColor)}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Target</p>
                </div>
                <div>
                  <div
                    className="rounded-xl shadow-inner"
                    style={{ width: 148, height: 148, backgroundColor: rgbToHex(inputColor) }}
                  />
                  <p className="text-xs mt-2 font-mono" style={{ color: theme.colors.text }}>
                    {rgbToHex(inputColor)}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>Your Pick</p>
                </div>
              </div>

              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                Delta E: {lastResult.deltaE.toFixed(2)}
              </p>

              <button
                onClick={startNewRound}
                className="px-6 py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Next Round
              </button>
            </div>
          )}
        </section>

        {/* Score History */}
        <section className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
            Score History
          </h2>

          {loading ? (
            <p className="text-sm text-center py-2" style={{ color: theme.colors.textMuted }}>Loading...</p>
          ) : scores.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: theme.colors.textMuted }}>
              No attempts yet. Start a game!
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {scores.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <div
                    className="w-8 h-8 rounded flex-shrink-0"
                    style={{ backgroundColor: entry.target_color }}
                  />
                  <div
                    className="w-8 h-8 rounded flex-shrink-0"
                    style={{ backgroundColor: entry.input_color }}
                  />
                  <span
                    className="text-sm font-bold flex-shrink-0"
                    style={{ color: scoreColor(entry.score), minWidth: 32 }}
                  >
                    {entry.score}
                  </span>
                  <span className="text-xs ml-auto flex-shrink-0" style={{ color: theme.colors.textMuted }}>
                    {formatTimeAgo(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
