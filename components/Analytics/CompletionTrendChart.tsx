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
} from 'recharts';
import { CompletionTrendPoint } from '@/lib/analytics';
import { ChartCard } from './ChartCard';

interface CompletionTrendChartProps {
  data: CompletionTrendPoint[];
}

export const CompletionTrendChart: React.FC<CompletionTrendChartProps> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.completed, 0);
  const isEmpty = total === 0;

  return (
    <ChartCard
      title="Tasks Completed"
      subtitle={isEmpty ? undefined : `${total} completed in this range`}
      isEmpty={isEmpty}
      emptyMessage="No completed tasks in this range yet"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            interval="preserveStartEnd"
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [Number(value) || 0, 'Completed']}
            labelStyle={{ color: 'var(--color-text-primary)' }}
            contentStyle={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: 'var(--color-bg-tertiary)' }}
          />
          <Bar dataKey="completed" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
