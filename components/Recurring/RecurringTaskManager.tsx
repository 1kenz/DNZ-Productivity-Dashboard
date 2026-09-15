'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RecurringTask, RecurrenceFrequency, Priority } from '@/types';
import { formatSchedule, WEEKDAYS, toDateInputValue } from '@/lib/recurrence';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './RecurringTaskManager.module.css';

export const RecurringTaskManager: React.FC = () => {
  const { recurringTasks, projects, addRecurringTask, updateRecurringTask, deleteRecurringTask } = useApp();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTask | null>(null);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval_] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]); // default Monday
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('recurring.title')}</h3>
        <button className={styles.addBtn} onClick={() => handleOpenModal()} title={t('recurring.add')}>
          +
        </button>
      </div>

      {recurringTasks.length > 0 && (
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t('recurring.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <div className={styles.list}>
        {recurringTasks
          .filter((task) => task.title.toLowerCase().includes(search.trim().toLowerCase()))
          .map((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          return (
            <div key={task.id} className={`${styles.item} ${!task.active ? styles.paused : ''}`}>
              <div className={styles.info}>
                <span className={styles.icon}>🔁</span>
                <div className={styles.textCol}>
                  <span className={styles.name}>{task.title}</span>
                  <span className={styles.schedule}>
                    {formatSchedule(task)}
                    {project && (
                      <>
                        {' · '}
                        <span style={{ color: project.color }}>
                          {project.icon} {project.name}
                        </span>
                      </>
                    )}
                    {!task.active && ` · ${t('recurring.paused')}`}
                  </span>
                </div>
              </div>
              <div className={styles.actions}>
                <button onClick={() => toggleActive(task)} title={task.active ? t('common.pause') : t('common.resume')}>
                  {task.active ? '⏸️' : '▶️'}
                </button>
                <button onClick={() => handleOpenModal(task)} title={t('common.edit')}>✏️</button>
                <button
                  className={styles.deleteBtn}
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
            </div>
          );
        })}
        {recurringTasks.length === 0 && <p className={styles.empty}>{t('recurring.noTasks')}</p>}
        {recurringTasks.length > 0 &&
          recurringTasks.filter((task) => task.title.toLowerCase().includes(search.trim().toLowerCase())).length === 0 && (
            <p className={styles.empty}>{t('tasks.noTasks')}</p>
          )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t('recurring.edit') : t('recurring.new')}
        size="md"
      >
        <div className={styles.form}>
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
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('tasks.selectProject')}</label>
              <select className={styles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">{t('common.none')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.priorityGroup}>
            <label className={styles.label}>{t('tasks.priority')}</label>
            <div className={styles.priorityButtons}>
              {(['routine', 'low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.priorityBtn} ${styles[p]} ${priority === p ? styles.active : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.frequency')}</label>
              <select
                className={styles.select}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              >
                <option value="daily">{t('recurring.daily')}</option>
                <option value="weekly">{t('recurring.weekly')}</option>
                <option value="monthly">{t('recurring.monthly')}</option>
              </select>
            </div>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.interval')}</label>
              <input
                type="number"
                min={1}
                className={styles.select}
                value={interval}
                onChange={(e) => setInterval_(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.daysOfWeek')}</label>
              <div className={styles.dayGrid}>
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`${styles.dayBtn} ${daysOfWeek.includes(d.value) ? styles.active : ''}`}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.dayOfMonth')}</label>
              <input
                type="number"
                min={1}
                max={31}
                className={styles.select}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.startDate')}</label>
              <input
                type="date"
                className={styles.select}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('recurring.endDate')}</label>
              <input
                type="date"
                className={styles.select}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave}>
            {editing ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
