'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFocus } from '@/contexts/FocusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DOMAIN_AREAS, DomainArea } from '@/types';
import styles from './CommandPalette.module.css';

interface CommandPaletteProps {
  onNavigateTab?: (tab: 'dashboard' | 'time-tracker' | 'notes' | 'analytics' | 'ai') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigateTab }) => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    todos,
    projects,
    setIsQuickNotesOpen,
    setIsLiveVoiceOpen,
    setSelectedDomain,
    toggleTheme,
    toggleFocusMode,
  } = useApp();

  const { togglePomodoro, isPomodoroActive, toggleTracking, isTimeTracking } = useFocus();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const quickActions = [
    {
      id: 'pomo',
      icon: isPomodoroActive ? '⏸️' : '🎯',
      title: isPomodoroActive ? t('palette.pausePomo') : t('palette.startPomo'),
      action: () => togglePomodoro(),
    },
    {
      id: 'tracker',
      icon: isTimeTracking ? '⏹️' : '⏳',
      title: isTimeTracking ? t('palette.stopTracking') : t('palette.startTracking'),
      action: () => toggleTracking(),
    },
    {
      id: 'notes',
      icon: '📝',
      title: t('palette.openNotes'),
      action: () => setIsQuickNotesOpen(true),
    },
    {
      id: 'ai-chat',
      icon: '🤖',
      title: t('palette.openAi'),
      action: () => onNavigateTab?.('ai'),
    },
    {
      id: 'ai-voice',
      icon: '🎙️',
      title: t('palette.openVoice'),
      action: () => setIsLiveVoiceOpen(true),
    },
    {
      id: 'theme',
      icon: '🌓',
      title: t('palette.toggleTheme'),
      action: () => toggleTheme(),
    },
    {
      id: 'focus-mode',
      icon: '🧘',
      title: t('palette.toggleFocus'),
      action: () => toggleFocusMode(),
    },
  ];

  const domainActions = (Object.keys(DOMAIN_AREAS) as DomainArea[]).map((d) => ({
    id: `domain-${d}`,
    icon: DOMAIN_AREAS[d].icon,
    title: `${t('palette.domainArea')}: ${DOMAIN_AREAS[d].label}`,
    action: () => setSelectedDomain(d),
  }));

  const matchingTodos = todos
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((item) => ({
      id: `todo-${item.id}`,
      icon: item.completed ? '✅' : '⚪',
      title: item.title,
      badge: t('nav.tasks'),
      action: () => {
        // scroll to task
        const el = document.getElementById(`task-${item.id}`);
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    }));

  const allItems = [
    ...quickActions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())),
    ...domainActions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())),
    ...matchingTodos,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        item.action();
        setIsCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setIsCommandPaletteOpen(false)}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>⌘</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('palette.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className={styles.escBadge}>ESC</span>
        </div>

        <div className={styles.resultsList}>
          {allItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
              {t('palette.noResults')}
            </div>
          ) : (
            allItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${idx === selectedIndex ? styles.selected : ''}`}
                onClick={() => {
                  item.action();
                  setIsCommandPaletteOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.itemLeft}>
                  <span className={styles.itemIcon}>{item.icon}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                </div>
                {(item as any).badge && (
                  <span className={styles.itemBadge}>{(item as any).badge}</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>{t('palette.footerNav')}</span>
          <span>DNZ OS v3.0 Global Palette</span>
        </div>
      </div>
    </div>
  );
};
