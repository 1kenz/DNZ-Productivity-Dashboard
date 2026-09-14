'use client';

import React from 'react';
import styles from './ChartCard.module.css';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  isEmpty,
  emptyMessage = 'Not enough data yet',
  children,
  headerAction,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {headerAction}
      </div>
      {isEmpty ? <p className={styles.empty}>{emptyMessage}</p> : <div className={styles.body}>{children}</div>}
    </div>
  );
};
