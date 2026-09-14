'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { RecurringTask, RecurrenceFrequency, Priority } from '@/types';
import { formatSchedule, WEEKDAYS, toDateInputValue } from '@/lib/recurrence';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './RecurringTaskManager.module.css';

export const RecurringTaskManager: React.FC = () => {
  const { recurringTasks, projects, addRecurringTask, updateRecurringTask, deleteRecurringTask } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTask | null>(null);

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
        <h3 className={styles.title}>Recurring Tasks</h3>
        <button className={styles.addBtn} onClick={() => handleOpenModal()} title="Add Recurring Task">
          +
        </button>
      </div>

      <div className={styles.list}>
        {recurringTasks.map((task) => {
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
                    {!task.active && ' · Paused'}
                  </span>
                </div>
              </div>
              <div className={styles.actions}>
                <button onClick={() => toggleActive(task)} title={task.active ? 'Pause' : 'Resume'}>
                  {task.active ? '⏸️' : '▶️'}
                </button>
                <button onClick={() => handleOpenModal(task)} title="Edit">✏️</button>
                <button className={styles.deleteBtn} onClick={() => deleteRecurringTask(task.id)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
        {recurringTasks.length === 0 && <p className={styles.empty}>No recurring tasks yet</p>}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Edit Recurring Task' : 'New Recurring Task'}
        size="md"
      >
        <div className={styles.form}>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Water the plants"
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {projects.length > 0 && (
            <div className={styles.selectGroup}>
              <label className={styles.label}>Project (optional)</label>
              <select className={styles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.priorityGroup}>
            <label className={styles.label}>Priority</label>
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
              <label className={styles.label}>Repeats</label>
              <select
                className={styles.select}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className={styles.selectGroup}>
              <label className={styles.label}>
                Every{' '}
                {frequency === 'daily' ? 'N day(s)' : frequency === 'weekly' ? 'N week(s)' : 'N month(s)'}
              </label>
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
              <label className={styles.label}>On these days</label>
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
              <label className={styles.label}>Day of month</label>
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
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                className={styles.select}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.selectGroup}>
              <label className={styles.label}>End Date (optional)</label>
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
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {editing ? 'Update' : 'Create'} Recurring Task
          </Button>
        </div>
      </Modal>
    </div>
  );
};
