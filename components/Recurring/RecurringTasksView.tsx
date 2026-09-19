'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RecurringTask, RecurrenceFrequency, Priority } from '@/types';
import { PRIORITY_RANK } from '@/lib/priority';
import { formatSchedule, WEEKDAYS, toDateInputValue } from '@/lib/recurrence';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import formStyles from './RecurringTaskManager.module.css';
import styles from './RecurringTasksView.module.css';

type StatusFilter = 'all' | 'active' | 'paused';
type RecurringSortField = 'title' | 'frequency' | 'project' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

const FREQUENCY_RANK: Record<RecurrenceFrequency, number> = { daily: 0, weekly: 1, monthly: 2 };

export const RecurringTasksView: React.FC = () => {
  const { recurringTasks, projects, addRecurringTask, updateRecurringTask, deleteRecurringTask } = useApp();
  const { t } = useLanguage();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Column sorting state (mirrors TimeTrackingView's sortable-column pattern)
  const [sortField, setSortField] = useState<RecurringSortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleToggleSort = (field: RecurringSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTask | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval_] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('medium');
    setFrequency('weekly');
    setInterval_(1);
    setDaysOfWeek([1]);
    setDayOfMonth(1);
    setStartDate(toDateInputValue(new Date()));
    setEndDate('');
  };

  const handleOpenModal = (task?: RecurringTask) => {
    if (task) {
      setEditing(task);
      setTitle(task.title);
      setDescription(task.description || '');
      setProjectId(task.projectId || '');
      setPriority(task.priority);
      setFrequency(task.frequency);
      setInterval_(task.interval);
      setDaysOfWeek(task.daysOfWeek?.length ? task.daysOfWeek : [1]);
      setDayOfMonth(task.dayOfMonth || 1);
      setStartDate(toDateInputValue(task.startDate));
      setEndDate(toDateInputValue(task.endDate));
    } else {
      setEditing(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (frequency === 'weekly' && daysOfWeek.length === 0) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: projectId || undefined,
      priority,
      tags: [] as string[],
      frequency,
      interval: Math.max(1, interval),
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : [],
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      active: editing ? editing.active : true,
    };

    if (editing) {
      updateRecurringTask(editing.id, payload);
    } else {
      addRecurringTask(payload);
    }

    setIsModalOpen(false);
  };

  const toggleActive = (task: RecurringTask) => {
    updateRecurringTask(task.id, { active: !task.active });
  };

  const activeCount = recurringTasks.filter((t) => t.active).length;
  const pausedCount = recurringTasks.length - activeCount;

  const filteredTasks = recurringTasks.filter((task) => {
    if (statusFilter === 'active' && !task.active) return false;
    if (statusFilter === 'paused' && task.active) return false;
    if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;
    if (search.trim() && !task.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'frequency': {
        const rankDiff = FREQUENCY_RANK[a.frequency] - FREQUENCY_RANK[b.frequency];
        cmp = rankDiff !== 0 ? rankDiff : a.interval - b.interval;
        break;
      }
      case 'project': {
        const nameA = projects.find((p) => p.id === a.projectId)?.name || '';
        const nameB = projects.find((p) => p.id === b.projectId)?.name || '';
        cmp = nameA.localeCompare(nameB);
        break;
      }
      case 'priority':
        cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        break;
      case 'status':
        cmp = a.active === b.active ? 0 : a.active ? -1 : 1;
        break;
      default:
        cmp = 0;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <div className={styles.container}>
      {/* 1. Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('recurring.title')}</h1>
          <p className={styles.subtitle}>
            {activeCount} {t('recurring.active')}, {pausedCount} {t('recurring.paused')}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            {t('recurring.add')}
          </Button>
        </div>
      </div>

      {/* 2. Filters */}
      <div className={styles.filterBar}>
        <div className={styles.segmentedFilter}>
          {(['all', 'active', 'paused'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterBtn} ${statusFilter === filter ? styles.active : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'all'
                ? t('common.all')
                : filter === 'active'
                ? t('recurring.active')
                : t('recurring.paused')}
            </button>
          ))}
        </div>

        <div className={styles.dropdowns}>
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
            placeholder={t('recurring.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Table */}
      <div className={styles.logTableCard}>
        {filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span style={{ fontSize: '2.5rem' }}>🔁</span>
            <p className={styles.emptyTitle}>{t('recurring.noTasks')}</p>
            <p className={styles.emptyHint}>{t('recurring.add')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableTh} onClick={() => handleToggleSort('title')} title={t('sortBy')}>
                  <div className={styles.thContent}>
                    <span>{t('tasks.title')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className={styles.sortableTh} onClick={() => handleToggleSort('frequency')} title={t('sortBy')}>
                  <div className={styles.thContent}>
                    <span>{t('recurring.frequency')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'frequency' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className={styles.sortableTh} onClick={() => handleToggleSort('project')} title={t('sortBy')}>
                  <div className={styles.thContent}>
                    <span>{t('projects')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'project' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className={styles.sortableTh} onClick={() => handleToggleSort('priority')} title={t('sortBy')}>
                  <div className={styles.thContent}>
                    <span>{t('tasks.priority')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'priority' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className={styles.sortableTh} onClick={() => handleToggleSort('status')} title={t('sortBy')}>
                  <div className={styles.thContent}>
                    <span>{t('common.pause')} / {t('common.resume')}</span>
                    <span className={styles.sortIndicator}>
                      {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th style={{ textAlign: 'right' }}>{t('common.edit')} / {t('common.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                return (
                  <tr key={task.id} className={`${styles.tableRow} ${!task.active ? styles.paused : ''}`}>
                    <td>
                      <div className={styles.taskMain}>
                        <span>🔁</span>
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td>{formatSchedule(task)}</td>
                    <td>
                      {project ? (
                        <span className={styles.projectPill} style={{ color: project.color }}>
                          {project.icon} {project.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{t('common.none')}</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.priorityBadge}>{task.priority}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${task.active ? styles.statusActive : styles.statusPaused}`}>
                        {task.active ? `▶️ ${t('recurring.active')}` : `⏸️ ${t('recurring.paused')}`}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCol}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => toggleActive(task)}
                          title={task.active ? t('common.pause') : t('common.resume')}
                        >
                          {task.active ? '⏸️' : '▶️'}
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenModal(task)}
                          title={t('common.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => {
                            const confirmMsg = t('tasks.deleteTaskConfirm') || 'Bu görevi silmek istediğinize emin misiniz?';
                            const message = task.title ? `"${task.title}"\n\n${confirmMsg}` : confirmMsg;
                            if (window.confirm(message)) {
                              deleteRecurringTask(task.id);
                            }
                          }}
                          title={t('common.delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal (same fields as the sidebar widget) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        title={editing ? t('recurring.edit') : t('recurring.new')}
        size="md"
      >
        <div className={formStyles.form}>
          <Input
            label={t('tasks.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Water the plants"
            autoFocus
          />
          <Textarea
            label={t('tasks.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {projects.length > 0 && (
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('tasks.selectProject')}</label>
              <select className={formStyles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">{t('common.none')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={formStyles.priorityGroup}>
            <label className={formStyles.label}>{t('tasks.priority')}</label>
            <div className={formStyles.priorityButtons}>
              {(['routine', 'low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${formStyles.priorityBtn} ${formStyles[p]} ${priority === p ? formStyles.active : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.frequency')}</label>
              <select
                className={formStyles.select}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              >
                <option value="daily">{t('recurring.daily')}</option>
                <option value="weekly">{t('recurring.weekly')}</option>
                <option value="monthly">{t('recurring.monthly')}</option>
              </select>
            </div>
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.interval')}</label>
              <input
                type="number"
                min={1}
                className={formStyles.select}
                value={interval}
                onChange={(e) => setInterval_(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.daysOfWeek')}</label>
              <div className={formStyles.dayGrid}>
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`${formStyles.dayBtn} ${daysOfWeek.includes(d.value) ? formStyles.active : ''}`}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.dayOfMonth')}</label>
              <input
                type="number"
                min={1}
                max={31}
                className={formStyles.select}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          )}

          <div className={formStyles.row}>
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.startDate')}</label>
              <input
                type="date"
                className={formStyles.select}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={formStyles.selectGroup}>
              <label className={formStyles.label}>{t('recurring.endDate')}</label>
              <input
                type="date"
                className={formStyles.select}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={formStyles.modalActions}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave}>
            {editing ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
