'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimeTrendPoint, CompletionTrendPoint, formatHours } from '@/lib/analytics';
import styles from './AnalyticsSummary.module.css';

interface AnalyticsSummaryProps {
  timeData: TimeTrendPoint[];
  completionData: CompletionTrendPoint[];
  totalTrackedSeconds?: number;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ timeData, completionData, totalTrackedSeconds }) => {
  const { t } = useLanguage();
  const totalHours = timeData.reduce((sum, d) => sum + d.hours, 0);
  const totalCompleted = completionData.reduce((sum, d) => sum + d.completed, 0);
  const dayCount = completionData.length || 1;
  const dailyAvg = Math.round((totalCompleted / dayCount) * 10) / 10;

  const bestDay = completionData.reduce<CompletionTrendPoint | null>((best, d) => {
    if (!best || d.completed > best.completed) return d;
    return best;
  }, null);

  const formatTrackedDisplay = () => {
    if (totalTrackedSeconds !== undefined) {
      if (totalTrackedSeconds === 0) return '0m';
      const hrs = Math.floor(totalTrackedSeconds / 3600);
      const mins = Math.floor((totalTrackedSeconds % 3600) / 60);
      const secs = totalTrackedSeconds % 60;
      if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
      if (hrs > 0) return `${hrs}h`;
      if (mins > 0) return `${mins}m`;
      return `${secs}s`;
    }
    return formatHours(totalHours);
  };

  const tiles: { label: string; value: string; icon: string; color: string }[] = [
    { label: t('stats.tracked'), value: formatTrackedDisplay(), icon: '⏱️', color: 'var(--color-primary)' },
    { label: t('tasks.completed'), value: String(totalCompleted), icon: '✅', color: 'var(--color-success)' },
    { label: t('analytics.dailyAvg'), value: `${dailyAvg}/${t('analytics.perDay') || 'day'}`, icon: '📈', color: 'var(--color-info)' },
    {
      label: t('analytics.bestDay') || 'Most Productive Day',
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
