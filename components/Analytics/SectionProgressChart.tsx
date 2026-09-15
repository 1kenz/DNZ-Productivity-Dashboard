'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { getSectionProgressList } from '@/lib/analytics';
import { ChartCard } from './ChartCard';

export const SectionProgressChart: React.FC = () => {
  const { sections, todos, projects } = useApp();
  const data = getSectionProgressList(sections, todos, projects);
  const isEmpty = data.length === 0;
  const height = Math.min(Math.max(data.length * 40, 120), 360);

  return (
    <ChartCard
      title="Top Sections"
      subtitle={isEmpty ? undefined : 'Ranked by completion'}
      isEmpty={isEmpty}
      emptyMessage="Break a project into sections to see them ranked here"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: 'var(--color-text-primary)' }}
            axisLine={false}
            tickLine={false}
            width={110}
            tickFormatter={(name: string) => (name.length > 14 ? `${name.slice(0, 13)}…` : name)}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              const point = entry?.payload as { completed: number; total: number; projectName?: string };
              const suffix = point.projectName ? ` — ${point.projectName}` : '';
              return [`${Number(value) || 0}% (${point.completed}/${point.total})${suffix}`, 'Progress'];
            }}
            labelStyle={{ color: 'var(--color-text-primary)' }}
            contentStyle={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: 'var(--color-bg-tertiary)' }}
          />
          <Bar dataKey="percent" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
