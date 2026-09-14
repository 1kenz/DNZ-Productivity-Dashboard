'use client';

import React from 'react';
import { TimeTrendPoint, CompletionTrendPoint, formatHours } from '@/lib/analytics';
import styles from './AnalyticsSummary.module.css';

interface AnalyticsSummaryProps {
  timeData: TimeTrendPoint[];
  completionData: CompletionTrendPoint[];
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ timeData, completionData }) => {
  const totalHours = timeData.reduce((sum, d) => sum + d.hours, 0);
  const totalCompleted = completionData.reduce((sum, d) => sum + d.completed, 0);
  const dayCount = completionData.length || 1;
  const dailyAvg = Math.round((totalCompleted / dayCount) * 10) / 10;

  const bestDay = completionData.reduce<CompletionTrendPoint | null>((best, d) => {
    if (!best || d.completed > best.completed) return d;
    return best;
  }, null);

  const tiles: { label: string; value: string; icon: string; color: string }[] = [
    { label: 'Tracked', value: formatHours(totalHours), icon: '⏱️', color: 'var(--color-primary)' },
    { label: 'Completed', value: String(totalCompleted), icon: '✅', color: 'var(--color-success)' },
    { label: 'Daily Avg', value: `${dailyAvg}/day`, icon: '📈', color: 'var(--color-info)' },
    {
      label: 'Best Day',
      value: bestDay && bestDay.completed > 0 ? `${bestDay.completed} · ${bestDay.label}` : '—',
      icon: '🏆',
      color: 'var(--color-warning)',
    },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.tile} style={{ '--tile-color': tile.color } as React.CSSProperties}>
          <div className={styles.tileHeader}>
            <span className={styles.icon}>{tile.icon}</span>
            <span className={styles.label}>{tile.label}</span>
          </div>
          <div className={styles.value}>{tile.value}</div>
        </div>
      ))}
    </div>
  );
};
