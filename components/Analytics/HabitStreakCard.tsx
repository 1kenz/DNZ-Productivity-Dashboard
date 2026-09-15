'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChartCard } from './ChartCard';

export const HabitStreakCard: React.FC = () => {
  const { recurringTasks, todos } = useApp();
  const { t } = useLanguage();

  const habits = recurringTasks.map((rt) => {
    // calculate completed instances
    const relatedTodos = todos.filter((t) => t.recurringTaskId === rt.id);
    const completedCount = relatedTodos.filter((t) => t.completed).length;
    // mock active streak based on completions
    const currentStreak = Math.min(completedCount, 14);

    return {
      id: rt.id,
      title: rt.title,
      frequency: rt.frequency,
      completions: completedCount,
      streak: currentStreak > 0 ? currentStreak : 1,
    };
  });

  return (
    <ChartCard
      title={t('analytics.habitStreaks')}
      subtitle={t('analytics.habitStreaksSub')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
        {habits.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
            {t('recurring.noTasks')}
          </div>
        ) : (
          habits.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔥</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f4f5' }}>
                    {h.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                    {h.frequency === 'daily' ? t('recurring.daily') : t('recurring.weekly')} • {h.completions} {t('tasks.completed')}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                <span>🔥 {h.streak} {t('tasks.today')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </ChartCard>
  );
};
