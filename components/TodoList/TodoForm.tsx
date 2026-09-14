'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Priority, RecurrenceFrequency } from '@/types';
import { WEEKDAYS, toDateInputValue } from '@/lib/recurrence';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import styles from './TodoForm.module.css';

interface TodoFormProps {
  onClose: () => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ onClose }) => {
  const { addTodo, addRecurringTask, projects, sections, kanbanColumns } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [projectId, setProjectId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState(kanbanColumns[0]?.id || 'todo');

  // Recurring task fields — only used when isRecurring is checked.
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval_] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]); // default Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState('');

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId('');
    setSectionId('');
    setDeadline('');
    setIsRecurring(false);
    setFrequency('weekly');
    setInterval_(1);
    setDaysOfWeek([1]);
    setDayOfMonth(1);
    setStartDate(toDateInputValue(new Date()));
    setEndDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isRecurring) {
      if (frequency === 'weekly' && daysOfWeek.length === 0) return;
      addRecurringTask({
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
        active: true,
      });
    } else {
      addTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        projectId: projectId || undefined,
        sectionId: sectionId || undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status,
        completed: false,
      });
    }

    resetForm();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Task Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        required
        autoFocus
      />

      <Textarea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add more details..."
        rows={4}
      />

      {projects.length > 0 && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>Project (optional)</label>
          <select
            className={styles.select}
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSectionId(''); // sections belong to a single project
            }}
          >
            <option value="">No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.icon} {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isRecurring && projectId && sections.some((s) => s.projectId === projectId) && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>Section (optional)</label>
          <select
            className={styles.select}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">No Section</option>
            {sections
              .filter((s) => s.projectId === projectId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ? `${s.icon} ` : ''}{s.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className={styles.recurringToggle}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          🔁 Make this a recurring task
        </label>
      </div>

      {!isRecurring && (
        <>
          <div className={styles.selectGroup}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {kanbanColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectGroup}>
            <label className={styles.label}>Deadline (optional)</label>
            <input
              type="date"
              className={styles.select}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </>
      )}

      {isRecurring && (
        <>
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
        </>
      )}

      <div className={styles.priorityGroup}>
        <label className={styles.label}>Priority</label>
        <div className={styles.priorityButtons}>
          <button
            type="button"
            className={`${styles.priorityBtn} ${styles.routine} ${priority === 'routine' ? styles.active : ''}`}
            onClick={() => setPriority('routine')}
          >
            Routine
          </button>
          <button
            type="button"
            className={`${styles.priorityBtn} ${styles.low} ${priority === 'low' ? styles.active : ''}`}
            onClick={() => setPriority('low')}
          >
            Low
          </button>
          <button
            type="button"
            className={`${styles.priorityBtn} ${styles.medium} ${priority === 'medium' ? styles.active : ''}`}
            onClick={() => setPriority('medium')}
          >
            Medium
          </button>
          <button
            type="button"
            className={`${styles.priorityBtn} ${styles.high} ${priority === 'high' ? styles.active : ''}`}
            onClick={() => setPriority('high')}
          >
            High
          </button>
          <button
            type="button"
            className={`${styles.priorityBtn} ${styles.urgent} ${priority === 'urgent' ? styles.active : ''}`}
            onClick={() => setPriority('urgent')}
          >
            Urgent
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          {isRecurring ? 'Create Recurring Task' : 'Add Task'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
