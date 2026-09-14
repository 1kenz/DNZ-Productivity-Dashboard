'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { TaskView } from '@/types';
import styles from './ViewControls.module.css';

export const ViewControls: React.FC = () => {
  const { viewPreferences, updateViewPreferences } = useApp();

  const handleViewChange = (view: TaskView) => {
    updateViewPreferences({ taskView: view });
  };

  return (
    <div className={styles.container}>
      <div className={styles.viewButtons}>
        <button
          className={`${styles.viewBtn} ${viewPreferences.taskView === 'list' ? styles.active : ''}`}
          onClick={() => handleViewChange('list')}
          title="List View"
        >
          <span className={styles.icon}>☰</span>
          <span className={styles.label}>List</span>
        </button>
        <button
          className={`${styles.viewBtn} ${viewPreferences.taskView === 'grid' ? styles.active : ''}`}
          onClick={() => handleViewChange('grid')}
          title="Grid View"
        >
          <span className={styles.icon}>⊞</span>
          <span className={styles.label}>Grid</span>
        </button>
        <button
          className={`${styles.viewBtn} ${viewPreferences.taskView === 'kanban' ? styles.active : ''}`}
          onClick={() => handleViewChange('kanban')}
          title="Kanban View"
        >
          <span className={styles.icon}>⊟</span>
          <span className={styles.label}>Kanban</span>
        </button>
      </div>
    </div>
  );
};
