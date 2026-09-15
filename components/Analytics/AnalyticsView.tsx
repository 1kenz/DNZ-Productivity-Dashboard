'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getPriorityDistribution,
  getStatusDistribution,
  getTimeTrend,
  getCompletionTrend,
  presetRange,
  formatHours,
} from '@/lib/analytics';
import { AnalyticsRangeControl } from './AnalyticsRangeControl';
import { AnalyticsSummary } from './AnalyticsSummary';
import { TimeTrendChart } from './TimeTrendChart';
import { CompletionTrendChart } from './CompletionTrendChart';
import { ActivityHeatmap, HeatmapPoint } from './ActivityHeatmap';
import { ProjectProgressChart } from './ProjectProgressChart';
import { SectionProgressChart } from './SectionProgressChart';
import { DistributionChart } from './DistributionChart';
import { LifeBalanceChart } from './LifeBalanceChart';
import { HabitStreakCard } from './HabitStreakCard';
import styles from './AnalyticsView.module.css';

type HeatmapMetric = 'completed' | 'time';

export const AnalyticsView: React.FC = () => {
  const { todos, kanbanColumns, timeEntries } = useApp();
  const { t } = useLanguage();
  const [presetDays, setPresetDays] = useState(14);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('completed');

  const isCustomActive = Boolean(customFrom && customTo && customFrom <= customTo);
  const range = isCustomActive
    ? { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T00:00:00`) }
    : presetRange(presetDays);

  const timeTrendData = getTimeTrend(timeEntries, range);
  const completionTrendData = getCompletionTrend(todos, range);
  const priorityData = getPriorityDistribution(todos);
  const statusData = getStatusDistribution(todos, kanbanColumns);

  const fromTime = range.from.getTime();
  const toTime = new Date(range.to).setHours(23, 59, 59, 999);
  const totalTrackedSeconds = timeEntries
    .filter((e) => {
      const entryTime = new Date(e.createdAt).getTime();
      return entryTime >= fromTime && entryTime <= toTime;
    })
    .reduce((acc, curr) => acc + curr.duration, 0);

  const heatmapPoints: HeatmapPoint[] =
    heatmapMetric === 'completed'
      ? completionTrendData.map((d) => ({ date: d.date, label: d.label, value: d.completed }))
      : timeTrendData.map((d) => ({ date: d.date, label: d.label, value: d.hours }));

  const heatmapFormatValue =
    heatmapMetric === 'completed'
      ? (v: number) => `${v} ${t('nav.tasks').toLowerCase()}`
      : (v: number) => formatHours(v);

  const handlePresetChange = (days: number) => {
    setPresetDays(days);
    setCustomFrom('');
    setCustomTo('');
  };

  const handleClearCustom = () => {
    setCustomFrom('');
    setCustomTo('');
  };

  return (
    <div className={styles.container}>
      <AnalyticsRangeControl
        presetDays={presetDays}
        onPresetChange={handlePresetChange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        isCustomActive={isCustomActive}
        onClearCustom={handleClearCustom}
      />

      <AnalyticsSummary
        timeData={timeTrendData}
        completionData={completionTrendData}
        totalTrackedSeconds={totalTrackedSeconds}
      />

      {/* Life Balance Wheel & Habit Streaks */}
      <div className={styles.row}>
        <LifeBalanceChart />
        <HabitStreakCard />
      </div>

      <div className={styles.row}>
        <TimeTrendChart data={timeTrendData} />
        <CompletionTrendChart data={completionTrendData} />
      </div>

      <ActivityHeatmap
        title={t('analytics.heatmap')}
        subtitle={
          heatmapMetric === 'completed' ? t('analytics.heatmapTasks') : t('analytics.heatmapTime')
        }
        points={heatmapPoints}
        formatValue={heatmapFormatValue}
        headerAction={
          <div className={styles.metricToggle}>
            <button
              type="button"
              className={`${styles.metricBtn} ${heatmapMetric === 'completed' ? styles.metricActive : ''}`}
              onClick={() => setHeatmapMetric('completed')}
            >
              {t('analytics.tasksDone')}
            </button>
            <button
              type="button"
              className={`${styles.metricBtn} ${heatmapMetric === 'time' ? styles.metricActive : ''}`}
              onClick={() => setHeatmapMetric('time')}
            >
              {t('analytics.timeSpent')}
            </button>
          </div>
        }
      />

      <div className={styles.row}>
        <ProjectProgressChart />
        <SectionProgressChart />
      </div>

      <div className={styles.row}>
        <DistributionChart
          title={t('analytics.priorityDist')}
          subtitle={t('tasks.active')}
          data={priorityData.map((p) => ({ label: p.label, count: p.count, color: p.color }))}
          emptyMessage={t('tasks.noTasks')}
        />
        <DistributionChart
          title={t('analytics.statusDist')}
          subtitle={t('kanban.board')}
          data={statusData.map((s) => ({ label: s.label, count: s.count, color: s.color }))}
          emptyMessage={t('tasks.noTasks')}
        />
      </div>
    </div>
  );
};
