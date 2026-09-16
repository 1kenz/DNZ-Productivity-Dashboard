'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFocus } from '@/contexts/FocusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatHours } from '@/lib/analytics';
import { DOMAIN_AREAS } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import styles from './TimeTrackingView.module.css';

type DateFilter = 'all' | 'today' | 'week' | 'month';
type SortField = 'name' | 'domain' | 'date' | 'duration';
type SortOrder = 'asc' | 'desc';

export const TimeTrackingView: React.FC = () => {
  const { timeEntries, todos, projects, deleteTimeEntry, addTimeEntry } = useApp();
  const {
    isTimeTracking,
    trackingElapsedTime,
    trackingTaskId,
    trackingProjectId,
    stopTracking,
    formatTime,
  } = useFocus();
  const { t } = useLanguage();

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Column sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Manual Add Form State
  const [manualProjId, setManualProjId] = useState(projects[0]?.id || '');
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));

  const activeTask = todos.find((t) => t.id === trackingTaskId);
  const activeProject = projects.find((p) => p.id === trackingProjectId);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'date' || field === 'duration' ? 'desc' : 'asc');
    }
  };

  // Filter entries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const filteredEntries = timeEntries.filter((entry) => {
    const entryTime = new Date(entry.createdAt).getTime();
    if (dateFilter === 'today' && entryTime < todayStart) return false;
    if (dateFilter === 'week' && entryTime < weekStart) return false;
    if (dateFilter === 'month' && entryTime < monthStart) return false;

    if (selectedProjectId !== 'all' && entry.projectId !== selectedProjectId) {
      const task = todos.find((t) => t.id === entry.taskId);
      if (task?.projectId !== selectedProjectId) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const proj = projects.find((p) => p.id === entry.projectId);
      const task = todos.find((t) => t.id === entry.taskId);
      const matchProj = proj?.name.toLowerCase().includes(q);
      const matchTask = task?.title.toLowerCase().includes(q);
      if (!matchProj && !matchTask) return false;
    }
    return true;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortField === 'date') {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortField === 'duration') {
      const diff = b.duration - a.duration;
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortField === 'domain') {
      const taskA = todos.find((t) => t.id === a.taskId);
      const projA = projects.find((p) => p.id === a.projectId) || (taskA?.projectId ? projects.find((p) => p.id === taskA.projectId) : undefined);
      const domainA = projA?.domain || taskA?.domain || 'general';

      const taskB = todos.find((t) => t.id === b.taskId);
      const projB = projects.find((p) => p.id === b.projectId) || (taskB?.projectId ? projects.find((p) => p.id === taskB.projectId) : undefined);
      const domainB = projB?.domain || taskB?.domain || 'general';

      const cmp = domainA.localeCompare(domainB);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (sortField === 'name') {
      const taskA = todos.find((t) => t.id === a.taskId);
      const projA = projects.find((p) => p.id === a.projectId) || (taskA?.projectId ? projects.find((p) => p.id === taskA.projectId) : undefined);
      const nameA = projA?.name || taskA?.title || '';

      const taskB = todos.find((t) => t.id === b.taskId);
      const projB = projects.find((p) => p.id === b.projectId) || (taskB?.projectId ? projects.find((p) => p.id === taskB.projectId) : undefined);
      const nameB = projB?.name || taskB?.title || '';

      const cmp = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    return 0;
  });

  const totalSeconds = sortedEntries.reduce((sum, e) => sum + e.duration, 0);

  const formatEntryDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManualSave = () => {
    if (!manualProjId || manualMinutes <= 0) return;
    addTimeEntry({
      projectId: manualProjId,
      taskId: manualTaskId || undefined,
      duration: manualMinutes * 60,
      createdAt: new Date(manualDate),
    });
    setIsManualModalOpen(false);
  };

  const handleSelectDomainProject = (projectId?: string) => {
    if (!projectId || projectId === 'default') return;
    if (selectedProjectId === projectId) {
      setSelectedProjectId('all');
    } else {
      setSelectedProjectId(projectId);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header & Live Focus Banner */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('timeTrackerTab')}</h1>
          <p className={styles.subtitle}>
            {t('analytics.totalLogged')}: <strong>{formatHours(totalSeconds / 3600)}</strong> ({sortedEntries.length} {t('tools.recentEntries')})
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setIsManualModalOpen(true)}>
            + {t('tools.addTimeManually')}
          </Button>
        </div>
      </div>

      {/* 2. Dynamic Island Live Session Bar (if active) */}
      {isTimeTracking && (
        <div className={styles.liveTrackingCard}>
          <div className={styles.liveInfo}>
            <span className={styles.livePulse} />
            <div>
              <div className={styles.liveBadge}>🔴 LIVE FOCUS TRACKING</div>
              <div className={styles.liveTaskName}>
                {activeTask ? `🎯 ${activeTask.title}` : activeProject ? `📁 ${activeProject.name}` : t('timeTracker')}
              </div>
            </div>
          </div>
          <div className={styles.liveTimerArea}>
            <span className={styles.liveTimerText}>
              {formatTime(trackingElapsedTime)}
            </span>
            <Button variant="danger" size="sm" onClick={stopTracking}>
              ⏹️ {t('stopTimer')}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Filters & Controls */}
      <div className={styles.filterBar}>
        <div className={styles.segmentedFilter}>
          {(['all', 'today', 'week', 'month'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterBtn} ${dateFilter === filter ? styles.active : ''}`}
              onClick={() => setDateFilter(filter)}
            >
              {filter === 'all'
                ? t('common.all')
                : filter === 'today'
                ? t('tasks.today')
                : filter === 'week'
                ? t('tasks.thisWeek')
                : t('analytics.days30')}
            </button>
          ))}
        </div>

        <div className={styles.dropdowns}>
          {selectedProjectId !== 'all' && (
            <button
              type="button"
              className={styles.clearFilterBadge}
              onClick={() => setSelectedProjectId('all')}
              title={t('common.clear')}
            >
              ✕ {projects.find((p) => p.id === selectedProjectId)?.name || 'Filtered'}
            </button>
          )}

          <select
            className={styles.projectSelect}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="all">{t('common.all')} {t('projects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Logs List Table */}
      <div className={styles.logTableCard}>
        {sortedEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <span style={{ fontSize: '2.5rem' }}>⏱️</span>
            <p className={styles.emptyTitle}>{t('tools.noEntries')}</p>
            <p className={styles.emptyHint}>
              {t('startTimer')}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  className={styles.sortableTh}
                  onClick={() => handleToggleSort('name')}
                  title={t('sortBy')}
                >
                  <div className={styles.thContent}>
                    <span>{t('projects')} / {t('tasks.title')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  className={styles.sortableTh}
                  onClick={() => handleToggleSort('domain')}
                  title={t('sortBy')}
                >
                  <div className={styles.thContent}>
                    <span>{t('tasks.sections')} / {t('domains.title')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'domain' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  className={styles.sortableTh}
                  onClick={() => handleToggleSort('date')}
                  title={t('sortBy')}
                >
                  <div className={styles.thContent}>
                    <span>{t('tasks.deadline')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  className={styles.sortableTh}
                  onClick={() => handleToggleSort('duration')}
                  title={t('sortBy')}
                >
                  <div className={styles.thContent}>
                    <span>{t('stats.tracked')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'duration' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th style={{ textAlign: 'right' }}>{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => {
                const task = todos.find((t) => t.id === entry.taskId);
                const project = projects.find((p) => p.id === entry.projectId) || 
                  (task?.projectId ? projects.find((p) => p.id === task.projectId) : undefined);
                
                const domainKey = project?.domain || task?.domain;
                const domainMeta = domainKey ? DOMAIN_AREAS[domainKey] : null;

                return (
                  <tr key={entry.id} className={styles.tableRow}>
                    <td>
                      <div className={styles.entryMain}>
                        <button
                          type="button"
                          className={styles.projectPillBtn}
                          style={{ color: project?.color || 'var(--color-primary)' }}
                          onClick={() => handleSelectDomainProject(project?.id)}
                          title={project ? `${project.name} projeyi filtrele` : undefined}
                        >
                          {project?.icon || '📁'} {project?.name || (task ? task.title : t('common.none'))}
                        </button>
                        {task && (
                          <span className={styles.taskTitle}>
                            ↳ {task.title}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.domainBadgeBtn}
                        onClick={() => handleSelectDomainProject(project?.id)}
                        title={project ? `${project.name} projesini filtrele` : t('domains.title')}
                        style={{
                          color: domainMeta?.color || 'var(--color-text-secondary)',
                          borderColor: domainMeta ? `color-mix(in srgb, ${domainMeta.color} 30%, transparent)` : undefined,
                        }}
                      >
                        {domainMeta ? `${domainMeta.icon} ${domainMeta.label}` : 'GENERAL'}
                      </button>
                    </td>
                    <td className={styles.dateCol}>
                      {formatEntryDate(entry.createdAt)}
                    </td>
                    <td>
                      <span className={styles.durationPill}>
                        ⏱️ {formatHours(entry.duration / 3600)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => {
                          if (confirm(`${t('common.delete')} time entry?`)) {
                            deleteTimeEntry(entry.id);
                          }
                        }}
                        title={t('common.delete')}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Time Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onConfirm={handleManualSave}
        title={t('tools.addTimeManually')}
        size="sm"
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('projects')}</label>
            <select
              className={styles.modalSelect}
              value={manualProjId}
              onChange={(e) => setManualProjId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('tasks.title')} ({t('common.none')})</label>
            <select
              className={styles.modalSelect}
              value={manualTaskId}
              onChange={(e) => setManualTaskId(e.target.value)}
            >
              <option value="">-- {t('tasks.allTasks')} --</option>
              {todos
                .filter((t) => !manualProjId || t.projectId === manualProjId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <Input
              label={t('timeTracking.durationMinutes') || 'Duration (Minutes)'}
              type="number"
              min={1}
              value={manualMinutes}
              onChange={(e) => setManualMinutes(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('recurring.startDate')}</label>
            <input
              type="date"
              className={styles.modalSelect}
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>

          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsManualModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleManualSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
