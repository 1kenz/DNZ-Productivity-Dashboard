'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GlassTheme } from '@/types';

interface ThemeCustomizerContextType {
  glassTheme: GlassTheme;
  setGlassTheme: (theme: GlassTheme) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined);

export const ThemeCustomizerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [glassTheme, setGlassThemeState] = useState<GlassTheme>('sonoma');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('productivity-glass-theme') as GlassTheme;
    if (saved && ['sonoma', 'carbon', 'obsidian', 'cyber', 'nordic'].includes(saved)) {
      setGlassThemeState(saved);
      document.documentElement.setAttribute('data-glass-theme', saved);
    } else {
      document.documentElement.setAttribute('data-glass-theme', 'sonoma');
    }
  }, []);

  const setGlassTheme = (theme: GlassTheme) => {
    setGlassThemeState(theme);
    localStorage.setItem('productivity-glass-theme', theme);
    document.documentElement.setAttribute('data-glass-theme', theme);
  };

  return (
    <ThemeCustomizerContext.Provider
      value={{
        glassTheme,
        setGlassTheme,
        isThemeModalOpen,
        setIsThemeModalOpen,
      }}
    >
      {children}
    </ThemeCustomizerContext.Provider>
  );
};

export const useThemeCustomizer = () => {
  const context = useContext(ThemeCustomizerContext);
  if (!context) {
    throw new Error('useThemeCustomizer must be used within ThemeCustomizerProvider');
  }
  return context;
};
