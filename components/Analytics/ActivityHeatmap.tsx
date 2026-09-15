'use client';

import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import styles from './ActivityHeatmap.module.css';

export interface HeatmapPoint {
  date: string; // YYYY-MM-DD, local
  label: string;
  value: number;
}

interface ActivityHeatmapProps {
  title: string;
  subtitle?: string;
  points: HeatmapPoint[];
  formatValue: (value: number) => string;
  headerAction?: React.ReactNode;
}

type Cell = { date: string; label: string; value: number } | null;

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const BUCKET_STOPS = [0, 20, 45, 70, 95]; // color-mix % toward --color-primary, index 0 = empty

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function bucketFor(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  return Math.min(4, Math.max(1, Math.ceil(ratio * 4)));
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  title,
  subtitle,
  points,
  formatValue,
  headerAction,
}) => {
  const { weeks, monthMarkers, max } = useMemo(() => {
    if (points.length === 0) return { weeks: [] as Cell[][], monthMarkers: [] as (string | null)[], max: 0 };

    const firstDate = parseLocalDate(points[0].date);
    const leadingBlanks = firstDate.getDay(); // 0 = Sunday
    const cells: Cell[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...points.map((p) => ({ date: p.date, label: p.label, value: p.value })),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const weekCols: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekCols.push(cells.slice(i, i + 7));
    }

    let lastMonth = -1;
    const markers = weekCols.map((col) => {
      const firstReal = col.find((c) => c !== null);
      if (!firstReal) return null;
      const d = parseLocalDate(firstReal.date);
      const month = d.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        return d.toLocaleDateString(undefined, { month: 'short' });
      }
      return null;
    });

    const maxValue = points.reduce((m, p) => Math.max(m, p.value), 0);

    return { weeks: weekCols, monthMarkers: markers, max: maxValue };
  }, [points]);

  const isEmpty = points.length === 0;

  return (
    <ChartCard title={title} subtitle={subtitle} isEmpty={isEmpty} emptyMessage="No activity in this range yet" headerAction={headerAction}>
      <div className={styles.scrollArea}>
        <div className={styles.layout}>
          <div className={styles.weekdayCol}>
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className={styles.weekdayLabel}>
                {label}
              </span>
            ))}
          </div>
          <div className={styles.weeksArea}>
            <div className={styles.monthRow}>
              {monthMarkers.map((m, i) => (
                <span key={i} className={styles.monthLabel}>
                  {m || ''}
                </span>
              ))}
            </div>
            <div className={styles.weeksGrid}>
              {weeks.map((col, colIdx) => (
                <div key={colIdx} className={styles.weekCol}>
                  {col.map((cell, rowIdx) => {
                    if (!cell) {
                      return <div key={rowIdx} className={styles.cell} style={{ background: 'transparent' }} />;
                    }
                    const bucket = bucketFor(cell.value, max);
                    const background =
                      bucket === 0
                        ? 'var(--color-bg-tertiary)'
                        : `color-mix(in srgb, var(--color-primary) ${BUCKET_STOPS[bucket]}%, var(--color-bg-tertiary))`;
                    return (
                      <div key={rowIdx} className={styles.cellWrap}>
                        <div className={styles.cell} style={{ background }} />
                        <span className={styles.tooltip}>
                          {formatValue(cell.value)} — {cell.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <span>Less</span>
        {BUCKET_STOPS.map((stop, i) => (
          <span
            key={i}
            className={styles.legendCell}
            style={{
              background:
                i === 0
                  ? 'var(--color-bg-tertiary)'
                  : `color-mix(in srgb, var(--color-primary) ${stop}%, var(--color-bg-tertiary))`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </ChartCard>
  );
};
