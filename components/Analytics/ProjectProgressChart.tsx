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
import { getProjectProgressList } from '@/lib/analytics';
import { ChartCard } from './ChartCard';

export const ProjectProgressChart: React.FC = () => {
  const { projects, todos } = useApp();
  const data = getProjectProgressList(projects, todos);
  const isEmpty = data.length === 0;
  // Taller with more projects, but capped so the card doesn't run away.
  const height = Math.min(Math.max(data.length * 40, 120), 360);

  return (
    <ChartCard
      title="Project Progress"
      subtitle={isEmpty ? undefined : `${data.length} project${data.length === 1 ? '' : 's'} with tasks`}
      isEmpty={isEmpty}
      emptyMessage="Add tasks to a project to see progress here"
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
              const point = entry?.payload as { completed: number; total: number };
              return [`${Number(value) || 0}% (${point.completed}/${point.total})`, 'Progress'];
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
            {data.map((p) => (
              <Cell key={p.id} fill={p.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
