'use client';

import React, { useState, useRef } from 'react';
import { useFocus, PomodoroMode } from '@/contexts/FocusContext';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import styles from './DynamicFocusBar.module.css';

export const DynamicFocusBar: React.FC = () => {
  const {
    pomodoroMode,
    pomodoroTimeLeft,
    isPomodoroActive,
    togglePomodoro,
    resetPomodoro,
    setPomodoroMode,
    formatTime,
    isTimeTracking,
    trackingElapsedTime,
    trackingTaskId,
    trackingProjectId,
    stopTracking,
  } = useFocus();

  const { setIsQuickNotesOpen, todos, projects } = useApp();
  const { t } = useLanguage();

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeTask = todos.find((t) => t.id === trackingTaskId);
  const activeProject = projects.find((p) => p.id === trackingProjectId);

  const formatStopwatch = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  const handleSelectPreset = (mode: PomodoroMode) => {
    setPomodoroMode(mode);
  };

  return (
    <div className={styles.focusBarContainer}>
      {/* 1. Live Active Tracker Pill (Dynamic Island) */}
      {isTimeTracking && (
        <div className={styles.activeTrackerPill}>
          <span className={styles.pulseDot} />
          <span className={styles.trackerIcon}>⏱️</span>
          <span className={styles.trackerLabel}>
            {activeTask ? activeTask.title : activeProject ? activeProject.name : t('timeTracker')}
          </span>
          <span className={styles.trackerElapsed}>{formatStopwatch(trackingElapsedTime)}</span>
          <button
            type="button"
            className={styles.stopTrackerBtn}
            onClick={stopTracking}
            title={t('common.stop')}
          >
            ⏹ {t('common.stop')}
          </button>
        </div>
      )}

      {/* 2. Apple Segmented Pomodoro Capsule */}
      <div
        className={styles.pomoCapsuleWrapper}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Apple Segmented Presets - Opens to the LEFT without shifting the main button */}
        <div className={`${styles.segmentedPresets} ${isHovered ? styles.visible : ''}`}>
          <button
            type="button"
            className={`${styles.presetBtn} ${pomodoroMode === 'shortBreak' ? styles.presetActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectPreset('shortBreak');
            }}
            title={t('pomodoroShort')}
          >
            5m
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${pomodoroMode === 'longBreak' ? styles.presetActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectPreset('longBreak');
            }}
            title={t('pomodoroLong')}
          >
            15m
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${pomodoroMode === 'work' ? styles.presetActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectPreset('work');
            }}
            title={t('pomodoroFocus')}
          >
            25m
          </button>
          <button
            type="button"
            className={styles.resetPresetBtn}
            onClick={(e) => {
              e.stopPropagation();
              resetPomodoro();
            }}
            title={t('pomodoroReset')}
          >
            ↺
          </button>
        </div>

        <div className={`${styles.appleCapsule} ${isPomodoroActive ? styles.active : ''}`}>
          <div
            className={styles.capsuleMain}
            onClick={togglePomodoro}
            title={isPomodoroActive ? t('common.pause') : t('common.start')}
          >
            <span className={styles.capsuleIcon}>{isPomodoroActive ? '🎯' : '⏱️'}</span>
            <span className={styles.capsuleTime}>{formatTime(pomodoroTimeLeft)}</span>
            <span className={styles.capsuleAction}>{isPomodoroActive ? '⏸' : '▶'}</span>
          </div>
        </div>
      </div>

      {/* 3. Apple Notes App Icon Button */}
      <button
        type="button"
        className={styles.appleNotesBtn}
        onClick={() => setIsQuickNotesOpen(true)}
        title={`${t('quickNotes.title')} (⌘J)`}
      >
        <AppleNotesIcon size={20} />
      </button>
    </div>
  );
};
