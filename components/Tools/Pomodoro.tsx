'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './Pomodoro.module.css';

type Mode = 'deepWork' | 'powerFocus' | 'shortBreak' | 'longBreak';

interface ModeConfig {
  id: Mode;
  labelKey: string;
  defaultLabel: string;
  duration: number; // in seconds
  color: string;
  dotColor: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'deepWork',
    labelKey: 'pomodoro.deepWork',
    defaultLabel: 'Deep Work',
    duration: 25 * 60,
    color: '#ea580c', // Warm vibrant orange matching theme
    dotColor: '#ea580c', // Matching orange dot
  },
  {
    id: 'powerFocus',
    labelKey: 'pomodoro.powerFocus',
    defaultLabel: 'Power Focus',
    duration: 50 * 60,
    color: '#f59e0b',
    dotColor: '#f59e0b',
  },
  {
    id: 'shortBreak',
    labelKey: 'pomodoro.short',
    defaultLabel: 'Short Break',
    duration: 5 * 60,
    color: '#10b981',
    dotColor: '#10b981',
  },
  {
    id: 'longBreak',
    labelKey: 'pomodoro.long',
    defaultLabel: 'Long Break',
    duration: 15 * 60,
    color: '#8b5cf6',
    dotColor: '#8b5cf6',
  },
];

export const Pomodoro: React.FC = () => {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<Mode>('deepWork');
  const [viewType, setViewType] = useState<'dial' | 'hourglass'>('dial');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentConfig = MODES.find((m) => m.id === selectedMode) || MODES[0];
  const totalDuration = currentConfig.duration;

  // Sound chime synthesizer
  const playChime = () => {
    if (!isSoundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1 (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Note 2 (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.28, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.9);
    } catch {
      // Audio context might be restricted
    }
  };

  // Timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playChime();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTimer = () => setIsActive((prev) => !prev);

  const selectMode = (mode: Mode) => {
    setSelectedMode(mode);
    setIsActive(false);
    const cfg = MODES.find((m) => m.id === mode) || MODES[0];
    setTimeLeft(cfg.duration);
    setIsDropdownOpen(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(currentConfig.duration);
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // SVG circular calculations: starts 100% full and DECREASES as time ticks down!
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const remainingRatio = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const strokeDashoffset = circumference * (1 - remainingRatio);

  // Hourglass geometry calculations
  const upperSandHeight = 44 * remainingRatio; // 0 to 44px
  const lowerSandHeight = 44 * (1 - remainingRatio); // 0 to 44px

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.focusDot} style={{ background: currentConfig.color }} />
          <span className={styles.title}>{t('pomodoro.title') || 'Pomodoro'}</span>
        </div>
        <div className={styles.headerControls}>
          {/* View Mode Toggle: Dial vs Hourglass */}
          <button
            type="button"
            className={`${styles.iconBtn} ${viewType === 'hourglass' ? styles.iconBtnActive : ''}`}
            onClick={() => setViewType((prev) => (prev === 'dial' ? 'hourglass' : 'dial'))}
            title={viewType === 'dial' ? 'Kum Saati Görünümüne Geç' : 'Dairesel Kadran Görünümüne Geç'}
          >
            {viewType === 'dial' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 22h14" />
                <path d="M5 2h14" />
                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setIsSoundOn(!isSoundOn)}
            title={isSoundOn ? 'Sesi Kapat / Mute' : 'Sesi Aç / Unmute'}
          >
            {isSoundOn ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main Display: Circular Dial OR Hourglass */}
      {viewType === 'dial' ? (
        <div className={styles.dialContainer}>
          <svg className={styles.dialSvg} viewBox="0 0 200 200">
            {/* Background Track */}
            <circle
              className={styles.dialTrack}
              cx="100"
              cy="100"
              r={radius}
              strokeWidth="6.5"
            />
            {/* Active Progress Arc (Starts full and decreases) */}
            <circle
              className={styles.dialProgress}
              cx="100"
              cy="100"
              r={radius}
              strokeWidth="6.5"
              stroke={currentConfig.color}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Content */}
          <div className={styles.dialContent}>
            <div className={styles.timeValue}>{formatTime(timeLeft)}</div>
            <div className={styles.durationSub} style={{ color: currentConfig.color }}>
              {Math.round(currentConfig.duration / 60)} min
            </div>

            {/* Mode Pill Dropdown */}
            <div className={styles.dropdownWrap} ref={dropdownRef}>
              <button
                type="button"
                className={`${styles.modePill} ${isDropdownOpen ? styles.modePillOpen : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                <span className={styles.pillDot} style={{ background: currentConfig.dotColor }} />
                <span className={styles.pillLabel}>{t(currentConfig.labelKey) || currentConfig.defaultLabel}</span>
                <svg className={`${styles.pillChevron} ${isDropdownOpen ? styles.chevronRotated : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.dropdownItem} ${selectedMode === m.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => selectMode(m.id)}
                    >
                      <span className={styles.itemDot} style={{ background: m.dotColor }} />
                      <span className={styles.itemLabel}>{t(m.labelKey) || m.defaultLabel}</span>
                      <span className={styles.itemDuration}>{Math.round(m.duration / 60)}m</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Animated Hourglass View */
        <div className={styles.hourglassContainer}>
          <div className={styles.hourglassGraphic}>
            <svg className={styles.hourglassSvg} viewBox="0 0 140 160">
              <defs>
                {/* Upper Sand Clip */}
                <clipPath id="upperBulbClip">
                  <path d="M 32 16 Q 32 60, 68 76 Q 70 78, 72 76 Q 108 60, 108 16 Z" />
                </clipPath>
                {/* Lower Sand Clip */}
                <clipPath id="lowerBulbClip">
                  <path d="M 32 144 Q 32 100, 68 84 Q 70 82, 72 84 Q 108 100, 108 144 Z" />
                </clipPath>
                <linearGradient id="sandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={currentConfig.color} stopOpacity="1" />
                </linearGradient>
                <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Glass Bulbs Outer Contour */}
              <path
                d="M 30 16 Q 30 62, 67 78 Q 70 80, 73 78 Q 110 62, 110 16 Z M 30 144 Q 30 98, 67 82 Q 70 80, 73 82 Q 110 98, 110 144 Z"
                className={styles.glassBody}
              />

              {/* Glass Specular Reflection Highlight */}
              <path
                d="M 36 24 Q 36 55, 62 70"
                fill="none"
                stroke="url(#glassShine)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 36 136 Q 36 105, 62 90"
                fill="none"
                stroke="url(#glassShine)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Top & Bottom Solid Caps */}
              <rect x="22" y="10" width="96" height="6" rx="3" className={styles.capSolid} />
              <rect x="22" y="144" width="96" height="6" rx="3" className={styles.capSolid} />

              {/* Upper Sand Body (Realistic funnel shape sinking into the center) */}
              <g clipPath="url(#upperBulbClip)">
                <path
                  d={`M 20 ${18 + (1 - remainingRatio) * 58} Q 70 ${18 + (1 - remainingRatio) * 58 + (remainingRatio > 0.05 ? 6 : 0)} 120 ${18 + (1 - remainingRatio) * 58} L 120 80 L 20 80 Z`}
                  fill="url(#sandGradient)"
                  className={styles.sandTransition}
                />
              </g>

              {/* Lower Sand Mound (Realistic curved sand cone building up) */}
              <g clipPath="url(#lowerBulbClip)">
                <path
                  d={`M 20 146 L 120 146 L 120 ${144 - (1 - remainingRatio) * 44} Q 70 ${144 - (1 - remainingRatio) * 58} 20 ${144 - (1 - remainingRatio) * 44} Z`}
                  fill="url(#sandGradient)"
                  className={styles.sandTransition}
                />
              </g>

              {/* Falling Sand Stream (Graceful, micro-grain downward flow) */}
              {isActive && remainingRatio > 0 && (
                <>
                  {/* Central micro-grain trickle */}
                  <line
                    x1="70"
                    y1="78"
                    x2="70"
                    y2="138"
                    stroke={currentConfig.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    className={styles.fallingStream}
                  />
                  {/* Individual tiny sand grains drifting down */}
                  <circle cx="70" cy="80" r="0.85" fill={currentConfig.color} className={styles.grain1} />
                  <circle cx="69.4" cy="80" r="0.75" fill={currentConfig.color} className={styles.grain2} />
                  <circle cx="70.6" cy="80" r="0.8" fill={currentConfig.color} className={styles.grain3} />
                  <circle cx="70" cy="80" r="0.9" fill={currentConfig.color} className={styles.grain4} />
                  <circle cx="69.6" cy="80" r="0.7" fill={currentConfig.color} className={styles.grain5} />
                  <circle cx="70.4" cy="80" r="0.8" fill={currentConfig.color} className={styles.grain6} />
                  {/* Gentle impact ripple at mound apex */}
                  <ellipse
                    cx="70"
                    cy={144 - (1 - remainingRatio) * 58}
                    rx="3"
                    ry="1"
                    fill={currentConfig.color}
                    className={styles.impactRipple}
                  />
                </>
              )}
            </svg>
          </div>

          {/* Hourglass Time & Info */}
          <div className={styles.hourglassInfo}>
            <div className={styles.timeValue}>{formatTime(timeLeft)}</div>
            <div className={styles.durationSub} style={{ color: currentConfig.color }}>
              {Math.round(currentConfig.duration / 60)} min
            </div>

            {/* Mode Pill */}
            <div className={styles.dropdownWrap} ref={dropdownRef}>
              <button
                type="button"
                className={`${styles.modePill} ${isDropdownOpen ? styles.modePillOpen : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                <span className={styles.pillDot} style={{ background: currentConfig.dotColor }} />
                <span className={styles.pillLabel}>{t(currentConfig.labelKey) || currentConfig.defaultLabel}</span>
                <svg className={`${styles.pillChevron} ${isDropdownOpen ? styles.chevronRotated : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.dropdownItem} ${selectedMode === m.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => selectMode(m.id)}
                    >
                      <span className={styles.itemDot} style={{ background: m.dotColor }} />
                      <span className={styles.itemLabel}>{t(m.labelKey) || m.defaultLabel}</span>
                      <span className={styles.itemDuration}>{Math.round(m.duration / 60)}m</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control Actions */}
      <div className={styles.controlsRow}>
        <button
          type="button"
          className={`${styles.mainActionBtn} ${isActive ? styles.btnActive : ''}`}
          onClick={toggleTimer}
          style={{
            '--accent-color': currentConfig.color,
          } as React.CSSProperties}
        >
          {isActive ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
              <span>{t('pomodoro.pause') || 'Durdur'}</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{t('pomodoro.start') || 'Başlat'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={resetTimer}
          title={t('pomodoro.reset') || 'Sıfırla'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Quick Switch Pills */}
      <div className={styles.quickModes}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${styles.quickPill} ${selectedMode === m.id ? styles.quickPillActive : ''}`}
            onClick={() => selectMode(m.id)}
            style={{
              '--mode-color': m.color,
            } as React.CSSProperties}
          >
            {Math.round(m.duration / 60)}m
          </button>
        ))}
      </div>
    </div>
  );
};
