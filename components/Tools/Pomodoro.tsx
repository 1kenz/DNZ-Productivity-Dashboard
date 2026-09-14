'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './Pomodoro.module.css';

type Mode = 'work' | 'shortBreak' | 'longBreak';

export const Pomodoro: React.FC = () => {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const SETTINGS = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (isSoundOn && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        alert(`${mode === 'work' ? 'Focus session' : 'Break'} finished!`);
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = (newMode: Mode = mode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(SETTINGS[newMode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.modes}>
        {(['work', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`${styles.modeBtn} ${mode === m ? styles.active : ''}`}
            onClick={() => resetTimer(m)}
          >
            {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
          </button>
        ))}
      </div>

      <div className={styles.timerDisplay}>
        {formatTime(timeLeft)}
      </div>

      <div className={styles.actions}>
        <Button 
          variant={isActive ? 'ghost' : 'primary'} 
          size="lg" 
          onClick={toggleTimer}
          className={styles.mainBtn}
        >
          {isActive ? 'Pause' : 'Start'}
        </Button>
        <button className={styles.resetBtn} onClick={() => resetTimer()} title="Reset">
          ↺
        </button>
        <button 
          className={styles.soundBtn} 
          onClick={() => setIsSoundOn(!isSoundOn)}
          title={isSoundOn ? 'Mute' : 'Unmute'}
        >
          {isSoundOn ? '🔊' : '🔇'}
        </button>
      </div>
      
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
    </div>
  );
};
