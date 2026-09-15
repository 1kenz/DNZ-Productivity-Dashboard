'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useApp } from './AppContext';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

interface FocusContextType {
  // Pomodoro
  pomodoroMode: PomodoroMode;
  pomodoroTimeLeft: number;
  isPomodoroActive: boolean;
  togglePomodoro: () => void;
  resetPomodoro: (mode?: PomodoroMode) => void;
  setPomodoroMode: (mode: PomodoroMode) => void;
  formatTime: (seconds: number) => string;

  // Time Tracking
  isTimeTracking: boolean;
  trackingElapsedTime: number;
  trackingProjectId: string | null;
  trackingTaskId: string | null;
  startTracking: (projectId: string, taskId?: string) => void;
  stopTracking: () => void;
  toggleTracking: (projectId?: string, taskId?: string) => void;
  setTrackingProjectId: (id: string | null) => void;
  setTrackingTaskId: (id: string | null) => void;
}

const POMODORO_SETTINGS: Record<PomodoroMode, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addTimeEntry, projects } = useApp();

  // Pomodoro State
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('work');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Time Tracker State
  const [isTimeTracking, setIsTimeTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
  const [trackingElapsedTime, setTrackingElapsedTime] = useState(0);
  const [trackingProjectId, setTrackingProjectId] = useState<string | null>(null);
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);

  // Setup sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }
  }, []);

  // Pomodoro Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomodoroActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroTimeLeft === 0 && isPomodoroActive) {
      setIsPomodoroActive(false);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        alert(`${pomodoroMode === 'work' ? '🎯 Odaklanma seansı' : '☕ Mola'} tamamlandı!`);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTimeLeft, pomodoroMode]);

  // Time Tracker Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimeTracking && trackingStartTime) {
      interval = setInterval(() => {
        setTrackingElapsedTime(Math.floor((Date.now() - trackingStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimeTracking, trackingStartTime]);

  const togglePomodoro = () => setIsPomodoroActive((prev) => !prev);

  const resetPomodoro = (mode: PomodoroMode = pomodoroMode) => {
    setIsPomodoroActive(false);
    setPomodoroMode(mode);
    setPomodoroTimeLeft(POMODORO_SETTINGS[mode]);
  };

  const startTracking = (projectId: string, taskId?: string) => {
    if (!projectId) {
      // Pick first project if available
      projectId = projects[0]?.id || 'default';
    }
    setTrackingProjectId(projectId);
    setTrackingTaskId(taskId || null);
    setIsTimeTracking(true);
    setTrackingStartTime(Date.now());
    setTrackingElapsedTime(0);
  };

  const stopTracking = () => {
    if (isTimeTracking && trackingElapsedTime > 0 && trackingProjectId) {
      addTimeEntry({
        projectId: trackingProjectId,
        taskId: trackingTaskId || undefined,
        duration: trackingElapsedTime,
        createdAt: new Date(),
      });
    }
    setIsTimeTracking(false);
    setTrackingStartTime(null);
    setTrackingElapsedTime(0);
  };

  const toggleTracking = (projectId?: string, taskId?: string) => {
    if (isTimeTracking) {
      stopTracking();
    } else {
      const pid = projectId || trackingProjectId || projects[0]?.id || '';
      startTracking(pid, taskId);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <FocusContext.Provider
      value={{
        pomodoroMode,
        pomodoroTimeLeft,
        isPomodoroActive,
        togglePomodoro,
        resetPomodoro,
        setPomodoroMode: (m) => resetPomodoro(m),
        formatTime,
        isTimeTracking,
        trackingElapsedTime,
        trackingProjectId,
        trackingTaskId,
        startTracking,
        stopTracking,
        toggleTracking,
        setTrackingProjectId,
        setTrackingTaskId,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};
