'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DOMAIN_AREAS, DomainArea } from '@/types';
import { ChartCard } from './ChartCard';

export const LifeBalanceChart: React.FC = () => {
  const { todos, projects, timeEntries } = useApp();
  const { t } = useLanguage();

  const domainCounts: Record<DomainArea, { taskCount: number; seconds: number }> = {
    engineering: { taskCount: 0, seconds: 0 },
    cybersecurity: { taskCount: 0, seconds: 0 },
    devops: { taskCount: 0, seconds: 0 },
    ai: { taskCount: 0, seconds: 0 },
    development: { taskCount: 0, seconds: 0 },
    sidehustle: { taskCount: 0, seconds: 0 },
    life: { taskCount: 0, seconds: 0 },
  };

  // Tally tasks
  for (const todo of todos) {
    const project = projects.find((p) => p.id === todo.projectId);
    const domain = (todo.domain || project?.domain || 'engineering') as DomainArea;
    if (domainCounts[domain]) {
      domainCounts[domain].taskCount += 1;
    }
  }

  // Tally time entries
  for (const entry of timeEntries) {
    const project = projects.find((p) => p.id === entry.projectId);
    const domain = (project?.domain || 'engineering') as DomainArea;
    if (domainCounts[domain]) {
      domainCounts[domain].seconds += entry.duration;
    }
  }

  const chartData = (Object.keys(DOMAIN_AREAS) as DomainArea[]).map((d) => {
    const meta = DOMAIN_AREAS[d];
    const data = domainCounts[d];
    return {
      name: meta.label,
      value: data.taskCount || 1, // at least 1 for display preview
      hours: +(data.seconds / 3600).toFixed(1),
      color: meta.color,
      icon: meta.icon,
    };
  });

  const totalTasks = todos.length;

  return (
    <ChartCard
      title={t('analytics.lifeBalance')}
      subtitle={t('analytics.lifeBalanceSub')}
    >
      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.3)" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
              }}
              formatter={(val: any, name: any, item: any) => [
                `${val} ${t('nav.tasks').toLowerCase()} (${item.payload.hours}h ${t('stats.tracked').toLowerCase()})`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: '#d4d4d8', fontSize: '0.78rem' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};
