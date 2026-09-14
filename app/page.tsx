'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Header } from '@/components/Dashboard/Header';
import { TodoList } from '@/components/TodoList';
import { LinkGroupGrid } from '@/components/QuickLinks/LinkGroupGrid';
import { ProjectManager } from '@/components/Projects';
import { RecurringTaskManager } from '@/components/Recurring';
import { Pomodoro, QuickNotes, TimeTracker } from '@/components/Tools';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import styles from './page.module.css';

export default function Home() {
  const { focusMode } = useApp();

  return (
    <main className={styles.main}>
      <div className="container">
        <Header />
        
        <div className={styles.dashboardGrid}>
          <div className={styles.sidebar}>
            {!focusMode && (
              <>
                <StatsCard />
                <div className={styles.spacer} />
              </>
            )}
            <ProjectManager />
            <div className={styles.spacer} />
            <RecurringTaskManager />
            <div className={styles.spacer} />
            <Pomodoro />
            <div className={styles.spacer} />
            <QuickNotes />
            <div className={styles.spacer} />
            <TimeTracker />
          </div>

          <div className={styles.content}>
            {!focusMode && (
              <>
                <LinkGroupGrid />
                <div className={styles.spacer} />
              </>
            )}
            <TodoList />
          </div>
        </div>
      </div>
    </main>
  );
}
