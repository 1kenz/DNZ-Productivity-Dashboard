'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import styles from './StatsCard.module.css';

export const StatsCard: React.FC = () => {
  const { todos, timeEntries } = useApp();

  const activeTasks = todos.filter(t => !t.completed && t.status !== 'done').length;
  const highPriority = todos.filter(t => !t.completed && (['high', 'urgent'] as string[]).includes(t.priority)).length;
  
  const today = new Date().toDateString();
  const completedToday = todos.filter(t => 
    (t.completed || t.status === 'done') && 
    new Date(t.updatedAt).toDateString() === today
  ).length;

  const totalTimeSeconds = timeEntries
    .filter(e => new Date(e.createdAt).toDateString() === today)
    .reduce((acc, curr) => acc + curr.duration, 0);

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

  const statItems = [
    { label: 'Active', value: activeTasks, icon: '📋', color: 'var(--color-primary)', targetId: 'tasks-section' },
    { label: 'Urgent', value: highPriority, icon: '🔥', color: 'var(--color-error)', targetId: 'tasks-section' },
    { label: 'Done Today', value: completedToday, icon: '✅', color: 'var(--color-success)', targetId: 'tasks-section' },
    { label: 'Tracked', value: formatTime(totalTimeSeconds), icon: '⏱️', color: 'var(--color-warning)', targetId: 'time-tracker-section' },
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Daily Overview</h3>
      <div className={styles.grid}>
        {statItems.map((stat, i) => (
          <button
            key={i}
            type="button"
            className={styles.statItem}
            style={{ '--stat-color': stat.color } as React.CSSProperties}
            onClick={() => scrollToSection(stat.targetId)}
            title={`Go to ${stat.label}`}
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
