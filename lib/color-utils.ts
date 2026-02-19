export interface RGB { r: number; g: number; b: number }
export interface HSV { h: number; s: number; v: number }
export interface LAB { l: number; a: number; b: number }

// --- Hex conversions ---

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(rgb.r)}${c(rgb.g)}${c(rgb.b)}`.toUpperCase();
}

// --- RGB <-> HSV ---

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  return { h, s, v };
}

export function hsvToRgb(hsv: HSV): RGB {
  const s = hsv.s / 100, v = hsv.v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs((hsv.h / 60) % 2 - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;
  const h = hsv.h % 360;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

// --- RGB -> CIELAB (via XYZ) ---

function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  // Linearize sRGB
  const linearize = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  // sRGB to XYZ (D65)
  return {
    x: (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100,
    y: (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100,
    z: (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100,
  };
}

function xyzToLab(xyz: { x: number; y: number; z: number }): LAB {
  // D65 reference white
  const xn = xyz.x / 95.047;
  const yn = xyz.y / 100.000;
  const zn = xyz.z / 108.883;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  return {
    l: 116 * f(yn) - 16,
    a: 500 * (f(xn) - f(yn)),
    b: 200 * (f(yn) - f(zn)),
  };
}

export function rgbToLab(rgb: RGB): LAB {
  return xyzToLab(rgbToXyz(rgb));
}

// --- Delta E (CIE76) ---

export function deltaE(c1: RGB, c2: RGB): number {
  const lab1 = rgbToLab(c1);
  const lab2 = rgbToLab(c2);
  return Math.sqrt(
    (lab1.l - lab2.l) ** 2 +
    (lab1.a - lab2.a) ** 2 +
    (lab1.b - lab2.b) ** 2
  );
}

// --- Score calculation ---

export function calculateScore(target: RGB, input: RGB): { score: number; deltaE: number } {
  const de = deltaE(target, input);
  return {
    score: Math.max(0, Math.round(100 - de)),
    deltaE: Math.round(de * 100) / 100,
  };
}

// --- Random color generation ---

export function generateRandomColor(): RGB {
  const rand = () => 20 + Math.floor(Math.random() * 216); // 20-235 range
  return { r: rand(), g: rand(), b: rand() };
}

// --- Harmony hue calculations ---

export type HarmonyRule = 'complementary' | 'triadic' | 'analogous' | 'split-complementary';

export function getHarmonyHues(h: number, rule: HarmonyRule): number[] {
  switch (rule) {
    case 'complementary':
      return [h, (h + 180) % 360];
    case 'triadic':
      return [h, (h + 120) % 360, (h + 240) % 360];
    case 'analogous':
      return [h, (h + 30) % 360, (h - 30 + 360) % 360];
    case 'split-complementary':
      return [h, (h + 150) % 360, (h + 210) % 360];
  }
}
