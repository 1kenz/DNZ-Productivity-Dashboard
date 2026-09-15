'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartCard } from './ChartCard';
import styles from './DistributionChart.module.css';

export interface DistributionDatum {
  label: string;
  count: number;
  color: string;
}

interface DistributionChartProps {
  title: string;
  subtitle?: string;
  data: DistributionDatum[];
  emptyMessage: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ title, subtitle, data, emptyMessage }) => {
  const isEmpty = data.length === 0;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ChartCard title={title} subtitle={subtitle} isEmpty={isEmpty} emptyMessage={emptyMessage}>
      <div className={styles.layout}>
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={34}
              outerRadius={56}
              paddingAngle={data.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const num = Number(value) || 0;
                return [`${num} (${Math.round((num / total) * 100)}%)`, String(name)];
              }}
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {data.map((d) => (
            <div key={d.label} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: d.color }} />
              <span className={styles.legendLabel}>{d.label}</span>
              <span className={styles.legendCount}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
};
