'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Theme, themes, defaultTheme, getThemeById } from '@/lib/themes';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-bg', theme.colors.background);
  root.style.setProperty('--theme-card', theme.colors.card);
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-text', theme.colors.text);
  root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
  root.style.setProperty('--theme-streak', theme.colors.streak);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
      const savedTheme = getThemeById(savedThemeId);
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  function setTheme(themeId: string) {
    const newTheme = getThemeById(themeId);
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', themeId);
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
