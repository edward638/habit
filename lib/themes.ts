export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;       // Main accent (buttons, checkboxes)
    primaryHover: string;  // Button hover state
    background: string;    // Page background
    card: string;          // Card/input background
    border: string;        // Borders
    text: string;          // Primary text
    textMuted: string;     // Secondary/muted text
    streak: string;        // Streak indicator color
  };
}

export const themes: Theme[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      background: '#f9fafb',
      card: '#ffffff',
      border: '#d1d5db',
      text: '#111827',
      textMuted: '#6b7280',
      streak: '#f97316',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#10b981',
      primaryHover: '#059669',
      background: '#f0fdf4',
      card: '#ffffff',
      border: '#bbf7d0',
      text: '#14532d',
      textMuted: '#4ade80',
      streak: '#facc15',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#f43f5e',
      primaryHover: '#e11d48',
      background: '#fff1f2',
      card: '#ffffff',
      border: '#fecdd3',
      text: '#881337',
      textMuted: '#fb7185',
      streak: '#8b5cf6',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      primary: '#f59e0b',
      primaryHover: '#d97706',
      background: '#fffbeb',
      card: '#ffffff',
      border: '#fde68a',
      text: '#78350f',
      textMuted: '#fbbf24',
      streak: '#ef4444',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      primary: '#64748b',
      primaryHover: '#475569',
      background: '#f8fafc',
      card: '#ffffff',
      border: '#cbd5e1',
      text: '#0f172a',
      textMuted: '#94a3b8',
      streak: '#22c55e',
    },
  },
  // Dark themes
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      primary: '#818cf8',
      primaryHover: '#6366f1',
      background: '#0f172a',
      card: '#1e293b',
      border: '#334155',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      streak: '#fb923c',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    colors: {
      primary: '#a78bfa',
      primaryHover: '#8b5cf6',
      background: '#09090b',
      card: '#18181b',
      border: '#27272a',
      text: '#fafafa',
      textMuted: '#71717a',
      streak: '#fbbf24',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#4ade80',
      primaryHover: '#22c55e',
      background: '#052e16',
      card: '#14532d',
      border: '#166534',
      text: '#ecfdf5',
      textMuted: '#86efac',
      streak: '#facc15',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      primary: '#fb7185',
      primaryHover: '#f43f5e',
      background: '#1c1917',
      card: '#292524',
      border: '#44403c',
      text: '#fafaf9',
      textMuted: '#a8a29e',
      streak: '#fcd34d',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#22d3ee',
      primaryHover: '#06b6d4',
      background: '#0c1929',
      card: '#0f2942',
      border: '#164e63',
      text: '#ecfeff',
      textMuted: '#67e8f9',
      streak: '#f472b6',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      primary: '#88c0d0',
      primaryHover: '#81a1c1',
      background: '#2e3440',
      card: '#3b4252',
      border: '#4c566a',
      text: '#eceff4',
      textMuted: '#d8dee9',
      streak: '#ebcb8b',
    },
  },
];

export const defaultTheme = themes[0];

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) ?? defaultTheme;
}
