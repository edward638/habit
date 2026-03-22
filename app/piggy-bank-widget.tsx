'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-provider';
import { formatBalance } from '@/lib/piggy-bank';

interface PiggyBankWidgetProps {
  balanceCents: number;
  animate?: 'earn' | 'lose' | null;
}

export default function PiggyBankWidget({ balanceCents, animate }: PiggyBankWidgetProps) {
  const { theme } = useTheme();
  const [showCoin, setShowCoin] = useState(false);
  const [balanceAnimating, setBalanceAnimating] = useState(false);
  const prevAnimate = useRef<string | null>(null);

  useEffect(() => {
    if (animate && animate !== prevAnimate.current) {
      prevAnimate.current = animate;
      setShowCoin(true);
      setBalanceAnimating(true);
      const coinTimer = setTimeout(() => setShowCoin(false), 700);
      const balTimer = setTimeout(() => setBalanceAnimating(false), 400);
      return () => { clearTimeout(coinTimer); clearTimeout(balTimer); };
    }
  }, [animate]);

  const isNegative = balanceCents < 0;
  // Fill level: 0–100% clamped between 0 and some max ($500 = full pig)
  const maxCents = 50000;
  const fillPct = Math.max(0, Math.min(100, (balanceCents / maxCents) * 100));
  const pigColor = isNegative ? '#94a3b8' : '#f9a8d4';
  const pigDarkColor = isNegative ? '#64748b' : '#f472b6';
  const fillColor = isNegative ? '#94a3b8' : '#f472b6';
  const coinColor = animate === 'lose' ? '#ef4444' : '#fbbf24';

  // Pig body SVG — viewed from the side, cute cartoon style
  const pigAnim = animate === 'earn' ? 'pig-bounce 0.5s ease' : animate === 'lose' ? 'pig-shake 0.5s ease' : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, userSelect: 'none' }}>
      {/* Coin animation */}
      <div style={{ position: 'relative', height: 0, width: 80 }}>
        {showCoin && (
          <div style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'coin-fall 0.7s ease forwards',
            fontSize: 20,
            zIndex: 10,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill={coinColor} stroke="#d97706" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">
                {animate === 'lose' ? '−' : '$'}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Pig SVG */}
      <div style={{ animation: pigAnim, transformOrigin: 'center bottom' }}>
        <svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="pig-body-clip">
              {/* Body ellipse clip */}
              <ellipse cx="52" cy="58" rx="38" ry="32" />
            </clipPath>
          </defs>

          {/* Tail */}
          <path d="M88 54 Q100 44 96 36 Q92 28 100 24" fill="none" stroke={pigDarkColor} strokeWidth="3" strokeLinecap="round" />

          {/* Body */}
          <ellipse cx="52" cy="58" rx="38" ry="32" fill={pigColor} />

          {/* Coin slot on top */}
          <rect x="44" y="27" width="16" height="4" rx="2" fill={pigDarkColor} />

          {/* Fill level (liquid inside pig) */}
          <rect
            x="14"
            y={90 - (fillPct * 62) / 100}
            width="76"
            height={(fillPct * 62) / 100}
            fill={fillColor}
            opacity="0.35"
            clipPath="url(#pig-body-clip)"
            style={{ transition: 'y 0.6s ease, height 0.6s ease' }}
          />

          {/* Belly highlight */}
          <ellipse cx="48" cy="65" rx="18" ry="13" fill="white" opacity="0.2" />

          {/* Head */}
          <circle cx="88" cy="52" r="20" fill={pigColor} />

          {/* Ear */}
          <ellipse cx="79" cy="35" rx="7" ry="9" fill={pigDarkColor} />
          <ellipse cx="79" cy="36" rx="4" ry="6" fill={pigColor} />

          {/* Snout */}
          <ellipse cx="96" cy="58" rx="10" ry="8" fill={pigDarkColor} />
          <circle cx="93" cy="58" r="2.5" fill="#1e293b" opacity="0.5" />
          <circle cx="99" cy="58" r="2.5" fill="#1e293b" opacity="0.5" />

          {/* Eye */}
          <circle cx="84" cy="47" r="3" fill="white" />
          <circle cx="85" cy="47" r="1.5" fill="#1e293b" />

          {/* Leg stubs */}
          <rect x="22" y="84" width="12" height="14" rx="6" fill={pigDarkColor} />
          <rect x="40" y="84" width="12" height="14" rx="6" fill={pigDarkColor} />
          <rect x="58" y="84" width="12" height="14" rx="6" fill={pigDarkColor} />
          <rect x="76" y="84" width="12" height="14" rx="6" fill={pigDarkColor} />
        </svg>
      </div>

      {/* Balance display */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: isNegative ? theme.colors.error ?? '#ef4444' : theme.colors.primary,
        animation: balanceAnimating ? 'balance-pop 0.4s ease' : 'none',
        letterSpacing: '-0.5px',
      }}>
        {formatBalance(balanceCents)}
      </div>

      <div style={{ fontSize: 12, color: theme.colors.textMuted }}>
        piggy bank
      </div>
    </div>
  );
}
