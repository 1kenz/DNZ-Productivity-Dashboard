'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TimeTrendPoint, formatHours } from '@/lib/analytics';
import { ChartCard } from './ChartCard';

interface TimeTrendChartProps {
  data: TimeTrendPoint[];
}

export const TimeTrendChart: React.FC<TimeTrendChartProps> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.hours, 0);
  const isEmpty = total === 0;

  return (
    <ChartCard
      title="Time Tracked"
      subtitle={isEmpty ? undefined : `${formatHours(total)} tracked in this range`}
      isEmpty={isEmpty}
      emptyMessage="No time entries in this range yet"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="timeTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            width={32}
          />
          <Tooltip
            formatter={(value) => [formatHours(Number(value) || 0), 'Tracked']}
            labelStyle={{ color: 'var(--color-text-primary)' }}
            contentStyle={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#timeTrendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
