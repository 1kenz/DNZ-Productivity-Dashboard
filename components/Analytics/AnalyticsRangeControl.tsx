'use client';

import React from 'react';
import styles from './AnalyticsRangeControl.module.css';

interface AnalyticsRangeControlProps {
  presetDays: number;
  onPresetChange: (days: number) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  isCustomActive: boolean;
  onClearCustom: () => void;
}

const PRESETS = [7, 14, 30];

export const AnalyticsRangeControl: React.FC<AnalyticsRangeControlProps> = ({
  presetDays,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  isCustomActive,
  onClearCustom,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.presetGroup}>
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            className={`${styles.presetBtn} ${!isCustomActive && presetDays === days ? styles.active : ''}`}
            onClick={() => onPresetChange(days)}
          >
            {days}D
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.customGroup}>
        <label className={styles.dateLabel}>
          From
          <input
            type="date"
            className={styles.dateInput}
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => onCustomFromChange(e.target.value)}
          />
        </label>
        <label className={styles.dateLabel}>
          To
          <input
            type="date"
            className={styles.dateInput}
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange(e.target.value)}
          />
        </label>
        {isCustomActive && (
          <button type="button" className={styles.clearBtn} onClick={onClearCustom} title="Clear custom range">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
