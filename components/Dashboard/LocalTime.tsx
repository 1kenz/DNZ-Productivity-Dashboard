'use client';

import React, { useState, useEffect } from 'react';
import styles from './LocalTime.module.css';

export const LocalTime: React.FC = () => {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(time);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(time);

  return (
    <div className={styles.container}>
      <div className={styles.timeWrapper}>
        <span className={styles.time}>{formattedTime}</span>
        <span className={styles.dots}>:</span>
        <span className={styles.seconds}>{time.getSeconds().toString().padStart(2, '0')}</span>
      </div>
      <span className={styles.date}>{formattedDate}</span>
    </div>
  );
};
