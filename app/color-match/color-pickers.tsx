'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { RGB, HSV, rgbToHsv, hsvToRgb, rgbToHex, getHarmonyHues, HarmonyRule } from '@/lib/color-utils';
import { useTheme } from '../theme-provider';

interface ColorPickerProps {
  color: RGB;
  onChange: (color: RGB) => void;
}

// ─── Shared: draw saturation/brightness canvas ───

function drawSVCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, hue: number) {
  // Base hue fill
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.fillRect(0, 0, width, height);

  // White gradient left → right
  const white = ctx.createLinearGradient(0, 0, width, 0);
  white.addColorStop(0, 'rgba(255,255,255,1)');
  white.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = white;
  ctx.fillRect(0, 0, width, height);

  // Black gradient top → bottom
  const black = ctx.createLinearGradient(0, 0, 0, height);
  black.addColorStop(0, 'rgba(0,0,0,0)');
  black.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, width, height);
}

// ─── Shared: pointer drag hook ───

function usePointerDrag(onDrag: (x: number, y: number, rect: DOMRect) => void) {
  const dragging = useRef(false);
  const elRef = useRef<HTMLElement | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    dragging.current = true;
    elRef.current = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    onDrag(e.clientX - rect.left, e.clientY - rect.top, rect);
  }, [onDrag]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onDrag(e.clientX - rect.left, e.clientY - rect.top, rect);
  }, [onDrag]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp };
}

// ─── Crosshair indicator ───

function Crosshair({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x - 8,
        top: y - 8,
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3)',
        backgroundColor: color,
      }}
    />
  );
}

// ═══════════════════════════════════════════
//  CLASSIC PICKER
// ═══════════════════════════════════════════

export function ClassicPicker({ color, onChange }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hsv = rgbToHsv(color);

  // Draw SV canvas when hue changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    drawSVCanvas(ctx, 280, 200, hsv.h);
  }, [hsv.h]);

  const svDrag = usePointerDrag(useCallback((x: number, y: number, rect: DOMRect) => {
    const s = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const v = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
    onChange(hsvToRgb({ h: hsv.h, s, v }));
  }, [hsv.h, onChange]));

  const hueDrag = usePointerDrag(useCallback((x: number, _y: number, rect: DOMRect) => {
    const h = Math.max(0, Math.min(360, (x / rect.width) * 360));
    onChange(hsvToRgb({ h, s: hsv.s, v: hsv.v }));
  }, [hsv.s, hsv.v, onChange]));

  return (
    <div className="flex flex-col items-center gap-3" style={{ width: 280 }}>
      {/* SV area */}
      <div className="relative rounded-lg overflow-hidden cursor-crosshair" style={{ width: 280, height: 200 }}>
        <canvas
          ref={canvasRef}
          style={{ width: 280, height: 200, display: 'block' }}
          {...svDrag}
        />
        <Crosshair
          x={(hsv.s / 100) * 280}
          y={((100 - hsv.v) / 100) * 200}
          color={rgbToHex(color)}
        />
      </div>

      {/* Hue bar */}
      <div
        className="relative rounded-full cursor-pointer"
        style={{
          width: 280,
          height: 20,
          background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
        }}
        {...hueDrag}
      >
        <div
          className="absolute top-0 pointer-events-none"
          style={{
            left: (hsv.h / 360) * 280 - 3,
            width: 6,
            height: 20,
            borderRadius: 3,
            backgroundColor: 'white',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  DISC PICKER
// ═══════════════════════════════════════════

export function DiscPicker({ color, onChange }: ColorPickerProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hsv = rgbToHsv(color);
  const size = 280;
  const ringWidth = 30;
  const innerSize = size - ringWidth * 2 - 20; // gap between ring and square

  // Draw SV canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerSize * dpr;
    canvas.height = innerSize * dpr;
    ctx.scale(dpr, dpr);
    drawSVCanvas(ctx, innerSize, innerSize, hsv.h);
  }, [hsv.h, innerSize]);

  // Ring drag
  const ringDrag = usePointerDrag(useCallback((x: number, y: number, rect: DOMRect) => {
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const angle = Math.atan2(y - cy, x - cx);
    let deg = (angle * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    onChange(hsvToRgb({ h: deg % 360, s: hsv.s, v: hsv.v }));
  }, [hsv.s, hsv.v, onChange]));

  // SV drag
  const svDrag = usePointerDrag(useCallback((x: number, y: number, rect: DOMRect) => {
    const s = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const v = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
    onChange(hsvToRgb({ h: hsv.h, s, v }));
  }, [hsv.h, onChange]));

  // Hue indicator position on the ring
  const hueRad = ((hsv.h - 90) * Math.PI) / 180;
  const ringCenter = size / 2;
  const ringRadius = (size - ringWidth) / 2;
  const hueX = ringCenter + Math.cos(hueRad) * ringRadius;
  const hueY = ringCenter + Math.sin(hueRad) * ringRadius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Hue wheel ring */}
      <div
        className="absolute inset-0 rounded-full cursor-pointer"
        style={{
          background: 'conic-gradient(from 0deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
        }}
        {...ringDrag}
      >
        {/* Inner cutout */}
        <div
          className="absolute rounded-full"
          style={{
            top: ringWidth,
            left: ringWidth,
            right: ringWidth,
            bottom: ringWidth,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>

      {/* Hue indicator dot */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: hueX - 8,
          top: hueY - 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.5)',
          zIndex: 10,
        }}
      />

      {/* SV square in center */}
      <div
        className="absolute rounded-lg overflow-hidden cursor-crosshair"
        style={{
          top: (size - innerSize) / 2,
          left: (size - innerSize) / 2,
          width: innerSize,
          height: innerSize,
          zIndex: 5,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: innerSize, height: innerSize, display: 'block' }}
          {...svDrag}
        />
        <Crosshair
          x={(hsv.s / 100) * innerSize}
          y={((100 - hsv.v) / 100) * innerSize}
          color={rgbToHex(color)}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  HARMONY PICKER
// ═══════════════════════════════════════════

export function HarmonyPicker({ color, onChange }: ColorPickerProps) {
  const { theme } = useTheme();
  const hsv = rgbToHsv(color);
  const [rule, setRule] = useState<HarmonyRule>('complementary');
  const size = 280;
  const ringWidth = 30;

  const harmonyHues = getHarmonyHues(hsv.h, rule);

  // Ring drag
  const ringDrag = usePointerDrag(useCallback((x: number, y: number, rect: DOMRect) => {
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const angle = Math.atan2(y - cy, x - cx);
    let deg = (angle * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    onChange(hsvToRgb({ h: deg % 360, s: hsv.s, v: hsv.v }));
  }, [hsv.s, hsv.v, onChange]));

  const ringCenter = size / 2;
  const ringRadius = (size - ringWidth) / 2;

  return (
    <div className="flex flex-col items-center gap-4" style={{ width: size }}>
      {/* Harmony rule dropdown */}
      <select
        value={rule}
        onChange={e => setRule(e.target.value as HarmonyRule)}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <option value="complementary">Complementary</option>
        <option value="triadic">Triadic</option>
        <option value="analogous">Analogous</option>
        <option value="split-complementary">Split-Complementary</option>
      </select>

      {/* Hue wheel */}
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full cursor-pointer"
          style={{
            background: 'conic-gradient(from 0deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
          }}
          {...ringDrag}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: ringWidth,
              left: ringWidth,
              right: ringWidth,
              bottom: ringWidth,
              backgroundColor: theme.colors.card,
            }}
          />
        </div>

        {/* Harmony dots */}
        {harmonyHues.map((h, i) => {
          const rad = ((h - 90) * Math.PI) / 180;
          const dx = ringCenter + Math.cos(rad) * ringRadius;
          const dy = ringCenter + Math.sin(rad) * ringRadius;
          const isPrimary = i === 0;
          const dotSize = isPrimary ? 18 : 14;
          return (
            <div
              key={`${rule}-${i}`}
              className="absolute cursor-pointer"
              style={{
                left: dx - dotSize / 2,
                top: dy - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: `hsl(${h}, 100%, 50%)`,
                border: `2px solid ${isPrimary ? 'white' : 'rgba(255,255,255,0.7)'}`,
                boxShadow: '0 0 3px rgba(0,0,0,0.5)',
                zIndex: isPrimary ? 11 : 10,
                opacity: isPrimary ? 1 : 0.85,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isPrimary) {
                  onChange(hsvToRgb({ h, s: hsv.s, v: hsv.v }));
                }
              }}
            />
          );
        })}
      </div>

      {/* Harmony color swatches */}
      <div className="flex gap-2 justify-center">
        {harmonyHues.map((h, i) => {
          const swatchRgb = hsvToRgb({ h, s: hsv.s, v: hsv.v });
          return (
            <button
              key={`swatch-${rule}-${i}`}
              className="rounded-lg transition-transform hover:scale-110"
              style={{
                width: 40,
                height: 40,
                backgroundColor: rgbToHex(swatchRgb),
                border: i === 0 ? '2px solid white' : `1px solid ${theme.colors.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
              onClick={() => onChange(swatchRgb)}
              title={`Hue ${Math.round(h)}°`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  VALUE PICKER (Sliders)
// ═══════════════════════════════════════════

function Slider({
  label,
  value,
  max,
  gradient,
  onChange: onSliderChange,
}: {
  label: string;
  value: number;
  max: number;
  gradient: string;
  onChange: (v: number) => void;
}) {
  const { theme } = useTheme();

  const drag = usePointerDrag(useCallback((x: number, _y: number, rect: DOMRect) => {
    const v = Math.max(0, Math.min(max, (x / rect.width) * max));
    onSliderChange(v);
  }, [max, onSliderChange]));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: theme.colors.textMuted }}>
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div
        className="relative rounded-full cursor-pointer"
        style={{ width: 280, height: 20, background: gradient }}
        {...drag}
      >
        <div
          className="absolute top-0 pointer-events-none"
          style={{
            left: (value / max) * 280 - 8,
            top: -2,
            width: 16,
            height: 24,
            borderRadius: 8,
            backgroundColor: 'white',
            boxShadow: '0 0 3px rgba(0,0,0,0.4)',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />
      </div>
    </div>
  );
}

export function ValuePicker({ color, onChange }: ColorPickerProps) {
  const { theme } = useTheme();
  const hsv = rgbToHsv(color);

  const hueGradient = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satGradient = `linear-gradient(to right, ${rgbToHex(hsvToRgb({ h: hsv.h, s: 0, v: hsv.v }))}, ${rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: hsv.v }))})`;
  const valGradient = `linear-gradient(to right, ${rgbToHex(hsvToRgb({ h: hsv.h, s: hsv.s, v: 0 }))}, ${rgbToHex(hsvToRgb({ h: hsv.h, s: hsv.s, v: 100 }))})`;

  return (
    <div className="flex flex-col gap-4" style={{ width: 280 }}>
      <Slider
        label="Hue"
        value={hsv.h}
        max={360}
        gradient={hueGradient}
        onChange={h => onChange(hsvToRgb({ h, s: hsv.s, v: hsv.v }))}
      />
      <Slider
        label="Saturation"
        value={hsv.s}
        max={100}
        gradient={satGradient}
        onChange={s => onChange(hsvToRgb({ h: hsv.h, s, v: hsv.v }))}
      />
      <Slider
        label="Brightness"
        value={hsv.v}
        max={100}
        gradient={valGradient}
        onChange={v => onChange(hsvToRgb({ h: hsv.h, s: hsv.s, v }))}
      />

      {/* RGB readout */}
      <div className="flex justify-center gap-4 text-xs" style={{ color: theme.colors.textMuted }}>
        <span>R: {color.r}</span>
        <span>G: {color.g}</span>
        <span>B: {color.b}</span>
      </div>
    </div>
  );
}
