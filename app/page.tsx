'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Header } from '@/components/Dashboard/Header';
import { TodoList } from '@/components/TodoList';
import { LinkGroupGrid } from '@/components/QuickLinks/LinkGroupGrid';
import { ProjectManager } from '@/components/Projects';
import { RecurringTaskManager } from '@/components/Recurring';
import { Pomodoro, QuickNotes, TimeTracker } from '@/components/Tools';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { AnalyticsView } from '@/components/Analytics';
import styles from './page.module.css';

type MainTab = 'dashboard' | 'analytics';

export default function Home() {
  const { focusMode } = useApp();
  const [tab, setTab] = useState<MainTab>('dashboard');

  return (
    <main className={styles.main}>
      <div className="container">
        <Header />

        {!focusMode && (
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'dashboard' ? styles.tabActive : ''}`}
              onClick={() => setTab('dashboard')}
            >
              📋 Dashboard
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'analytics' ? styles.tabActive : ''}`}
              onClick={() => setTab('analytics')}
            >
              📊 Analytics
            </button>
          </div>
        )}

        {tab === 'analytics' && !focusMode ? (
          <AnalyticsView />
        ) : (
          <div className={styles.dashboardGrid}>
            <div className={styles.sidebar}>
              {!focusMode && <StatsCard />}
              <ProjectManager />
              <RecurringTaskManager />
              <Pomodoro />
              <QuickNotes />
              <TimeTracker />
            </div>

            <div className={styles.content}>
              {!focusMode && (
                <div className={styles.card}>
                  <LinkGroupGrid />
                </div>
              )}
              <div className={styles.card}>
                <TodoList />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
