'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDueTodoGroups } from '@/lib/dueDates';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  /** Switches the main tab bar -- provided by app/page.tsx, which owns that state. */
  onNavigateTab?: (tab: 'time-tracker' | 'recurring-tasks') => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ onNavigateTab }) => {
  const { todos, timeEntries, recurringTasks, setQuickTaskFilter } = useApp();
  const { t } = useLanguage();

  const activeTasks = todos.filter((t) => !t.completed && t.status !== 'done').length;
  const urgentOrHighCount = todos.filter(
    (t) => !t.completed && t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')
  ).length;

  const today = new Date().toDateString();
  const completedToday = todos.filter(
    (t) =>
      (t.completed || t.status === 'done') &&
      new Date(t.updatedAt).toDateString() === today
  ).length;

  const totalTimeSeconds = timeEntries
    .filter((e) => new Date(e.createdAt).toDateString() === today)
    .reduce((acc, curr) => acc + curr.duration, 0);

  const dueGroups = getDueTodoGroups(todos);
  const dueSoonCount = dueGroups.overdue.length + dueGroups.today.length + dueGroups.soon.length;

  const activeRecurringCount = recurringTasks.filter((r) => r.active).length;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return `${Math.floor(seconds)}s`;
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Each card either narrows the Todo list to a specific quick filter (see
  // AppContext's QuickTaskFilter) and scrolls to it, or switches to a
  // different tab entirely (Time Tracker / Recurring) -- never just a bare
  // scroll to the generic, unfiltered task list.
  const statItems: Array<{
    label: string;
    value: number | string;
    icon: string;
    color: string;
    onClick: () => void;
  }> = [
    {
      label: t('stats.active') || 'Active',
      value: activeTasks,
      icon: '📋',
      color: 'var(--color-primary)',
      onClick: () => {
        setQuickTaskFilter('active');
        scrollToSection('tasks-section');
      },
    },
    {
      label: t('stats.urgentHigh') || t('stats.urgent') || 'Urgent & High',
      value: urgentOrHighCount,
      icon: '🚨',
      color: 'var(--color-urgent)',
      onClick: () => {
        setQuickTaskFilter('urgentHigh');
        scrollToSection('tasks-section');
      },
    },
    {
      label: t('stats.doneToday') || 'Done Today',
      value: completedToday,
      icon: '✅',
      color: 'var(--color-success)',
      onClick: () => {
        setQuickTaskFilter('doneToday');
        scrollToSection('tasks-section');
      },
    },
    {
      label: t('stats.tracked') || 'Tracked',
      value: formatTime(totalTimeSeconds),
      icon: '⏱️',
      color: 'var(--color-warning)',
      onClick: () => onNavigateTab?.('time-tracker'),
    },
    {
      label: t('stats.dueSoon') || 'Due Soon',
      value: dueSoonCount,
      icon: dueGroups.overdue.length > 0 ? '⚠️' : '📅',
      color: dueGroups.overdue.length > 0 ? 'var(--color-error)' : 'var(--color-warning)',
      onClick: () => {
        setQuickTaskFilter('dueSoon');
        scrollToSection('tasks-section');
      },
    },
    {
      label: t('stats.recurring') || 'Recurring Tasks',
      value: activeRecurringCount,
      icon: '🔁',
      color: 'var(--color-info, #06b6d4)',
      onClick: () => onNavigateTab?.('recurring-tasks'),
    },
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t('stats.dailyOverview')}</h3>
      <div className={styles.grid}>
        {statItems.map((stat, i) => (
          <button
            key={i}
            type="button"
            className={styles.statItem}
            style={{ '--stat-color': stat.color } as React.CSSProperties}
            onClick={stat.onClick}
            title={stat.label}
          >
            <div className={styles.statHeader}>
              <span className={styles.icon}>{stat.icon}</span>
              <span className={styles.label}>{stat.label}</span>
            </div>
            <div className={styles.value}>{stat.value}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
