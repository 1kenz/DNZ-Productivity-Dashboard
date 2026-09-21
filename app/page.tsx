'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Dashboard/Header';
import { TodoList } from '@/components/TodoList';
import { LinkGroupGrid } from '@/components/QuickLinks/LinkGroupGrid';
import { ProjectManager } from '@/components/Projects';
import { RecurringTaskManager, RecurringTasksView } from '@/components/Recurring';
import { Pomodoro, QuickNotes, TimeTracker, QuickNotesPopover, CommandPalette } from '@/components/Tools';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { AnalyticsView } from '@/components/Analytics';
import { AiChatView } from '@/components/AiChat';
import { TimeTrackingView } from '@/components/TimeTracking/TimeTrackingView';
import { NotesView } from '@/components/Notes/NotesView';
import { CalendarView } from '@/components/Calendar';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import {
  DashboardTabIcon,
  TimeTrackerTabIcon,
  RecurringTabIcon,
  AnalyticsTabIcon,
  AiAssistantTabIcon,
  CalendarTabIcon,
} from '@/components/ui/TabIcons';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { DueDatesController } from '@/components/TodoList';
import styles from './page.module.css';

type MainTab = 'dashboard' | 'time-tracker' | 'notes' | 'calendar' | 'recurring-tasks' | 'analytics' | 'ai';

export default function Home() {
  const { focusMode, pendingAiRequest, setPendingAiRequest } = useApp();
  const { t } = useLanguage();
  const [tab, setTab] = useState<MainTab>('dashboard');
  const [openCalendarManage, setOpenCalendarManage] = useState(false);

  // Whenever the visible section changes (tab switch or focus mode toggle),
  // jump back to the top of the page instead of keeping whatever scroll
  // position the previous view was left at.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [tab, focusMode]);

  // A task's "Ask AI" button (see AskAiButton.tsx) sets pendingAiRequest
  // from deep inside the Tasks view; jump to the AI Assistant tab so
  // AiChatView (rendered below with pendingAiRequest passed through) can
  // pick it up and act on it once mounted there.
  useEffect(() => {
    if (pendingAiRequest) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab('ai');
    }
  }, [pendingAiRequest]);

  // Connecting a Google/Apple account is a full-page OAuth round trip (see
  // ConnectCalendarsPanel's <a href="/api/google/auth">), so it lands back
  // here as a fresh page load at "/?drive=connected" (or "?drive=error...")
  // -- without this, that landed on whatever the default tab is
  // (Dashboard), leaving the person to manually navigate back to Calendar
  // and reopen Manage Calendars to see whether the connection worked.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drive = params.get('drive');
    if (drive === 'connected' || drive === 'error') {
      // Deliberately setting state inside this effect rather than during
      // render: window.location is only readable client-side, and this is
      // reacting to a one-time signal from an external system (the URL
      // left behind by the OAuth redirect) exactly once on mount, not a
      // per-render derivation that could cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab('calendar');
      setOpenCalendarManage(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
              <DashboardTabIcon size={16} />
              <span>{t('dashboardTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'time-tracker' ? styles.tabActive : ''}`}
              onClick={() => setTab('time-tracker')}
            >
              <TimeTrackerTabIcon size={16} />
              <span>{t('timeTrackerTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'notes' ? styles.tabActive : ''}`}
              onClick={() => setTab('notes')}
            >
              <AppleNotesIcon size={16} />
              <span>{t('notesTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'calendar' ? styles.tabActive : ''}`}
              onClick={() => setTab('calendar')}
            >
              <CalendarTabIcon size={16} />
              <span>{t('calendarTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'recurring-tasks' ? styles.tabActive : ''}`}
              onClick={() => setTab('recurring-tasks')}
            >
              <RecurringTabIcon size={16} />
              <span>{t('recurringTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'analytics' ? styles.tabActive : ''}`}
              onClick={() => setTab('analytics')}
            >
              <AnalyticsTabIcon size={16} />
              <span>{t('analyticsTab')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'ai' ? styles.tabActive : ''}`}
              onClick={() => setTab('ai')}
            >
              <AiAssistantTabIcon size={16} />
              <span>{t('aiTab')}</span>
            </button>
          </div>
        )}

        {tab === 'ai' && !focusMode ? (
          <AiChatView
            pendingRequest={pendingAiRequest}
            onPendingRequestConsumed={() => setPendingAiRequest(null)}
          />
        ) : tab === 'analytics' && !focusMode ? (
          <AnalyticsView />
        ) : tab === 'time-tracker' && !focusMode ? (
          <TimeTrackingView />
        ) : tab === 'notes' && !focusMode ? (
          <NotesView />
        ) : tab === 'calendar' && !focusMode ? (
          <CalendarView autoOpenManage={openCalendarManage} />
        ) : tab === 'recurring-tasks' && !focusMode ? (
          <RecurringTasksView />
        ) : focusMode ? (
          <div className={styles.dashboardGrid}>
            <div className={styles.sidebar}>
              <ProjectManager />
              <RecurringTaskManager onOpenFullView={() => setTab('recurring-tasks')} />
            </div>

            <div className={styles.content}>
              <div className={styles.card}>
                <TodoList />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.dashboardGrid}>
            <div className={styles.sidebar}>
              <StatsCard onNavigateTab={(target) => setTab(target)} />
              <ProjectManager />
              <RecurringTaskManager onOpenFullView={() => setTab('recurring-tasks')} />
              <QuickNotes />
              <Pomodoro />
              <TimeTracker onOpenFullView={() => setTab('time-tracker')} />
            </div>

            <div className={styles.content}>
              <div className={styles.card}>
                <LinkGroupGrid />
              </div>
              <div className={styles.card}>
                <TodoList />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Drawers and Modals */}
      <QuickNotesPopover />
      <CommandPalette onNavigateTab={(t) => setTab(t)} />
      <KeyboardShortcutsModal />
      <DueDatesController />
    </main>
  );
}
