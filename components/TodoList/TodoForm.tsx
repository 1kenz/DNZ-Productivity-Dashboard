'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Priority, RecurrenceFrequency, DOMAIN_AREAS, DomainArea } from '@/types';
import { WEEKDAYS, toDateInputValue } from '@/lib/recurrence';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VoiceInputButton } from '@/components/AiChat/VoiceInputButton';
import styles from './TodoForm.module.css';

interface TodoFormProps {
  onClose: () => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ onClose }) => {
  const { addTodo, addRecurringTask, projects, sections, kanbanColumns, selectedDomain } = useApp();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [domain, setDomain] = useState<DomainArea | ''>(selectedDomain || '');
  const [projectId, setProjectId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState(kanbanColumns[0]?.id || 'todo');

  // Numeric Goal
  const [isNumericGoal, setIsNumericGoal] = useState(false);
  const [targetCount, setTargetCount] = useState<number | ''>('');
  const [unit, setUnit] = useState(t('tasks.unitDefault'));

  // Recurring task fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval_] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
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
    setDomain('');
    setProjectId('');
    setSectionId('');
    setDeadline('');
    setIsNumericGoal(false);
    setTargetCount('');
    setUnit(t('tasks.unitDefault'));
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
        tags: domain ? [domain] : [],
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
        domain: (domain as DomainArea) || undefined,
        projectId: projectId || undefined,
        sectionId: sectionId || undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status,
        completed: false,
        targetCount: isNumericGoal && targetCount !== '' ? Number(targetCount) : undefined,
        currentCount: isNumericGoal ? 0 : undefined,
        unit: isNumericGoal ? unit : undefined,
      });
    }

    resetForm();
    onClose();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} onKeyDown={handleFormKeyDown}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Input
            label={t('tasks.taskTitle') || 'Task Title'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.titlePlaceholder') || 'What needs to be done? (Voice dictation supported)'}
            required
            autoFocus
          />
        </div>
        <VoiceInputButton
          onTranscriptChange={(text) => {
            setTitle((prev) => (prev ? `${prev} ${text}` : text));
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Textarea
            label={t('tasks.descriptionOpt') || 'Description (optional)'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tasks.descriptionPlaceholder') || 'Details, notes, or goals...'}
            rows={3}
          />
        </div>
        <div style={{ paddingTop: 28 }}>
          <VoiceInputButton
            onTranscriptChange={(text) => {
              setDescription((prev) => (prev ? `${prev} ${text}` : text));
            }}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.selectGroup}>
          <label className={styles.label}>{t('tasks.domain') || 'Life Domain'}</label>
          <select
            className={styles.select}
            value={domain}
            onChange={(e) => setDomain(e.target.value as DomainArea)}
          >
            <option value="">{t('tasks.unspecified') || 'Unspecified'}</option>
            {(Object.keys(DOMAIN_AREAS) as DomainArea[]).map((d) => (
              <option key={d} value={d}>
                {DOMAIN_AREAS[d].icon} {DOMAIN_AREAS[d].label}
              </option>
            ))}
          </select>
        </div>

        {projects.length > 0 && (
          <div className={styles.selectGroup}>
            <label className={styles.label}>{t('tasks.projectOpt') || 'Project (optional)'}</label>
            <select
              className={styles.select}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSectionId('');
              }}
            >
              <option value="">{t('tasks.noProject') || 'No Project'}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.icon} {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isRecurring && projectId && sections.some((s) => s.projectId === projectId) && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>{t('tasks.section') || 'Section'}</label>
          <select
            className={styles.select}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">{t('tasks.noSection') || 'No Section'}</option>
            {sections
              .filter((s) => s.projectId === projectId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ? `${s.icon} ` : ''}
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Numeric Goal option */}
      <div className={styles.recurringToggle}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isNumericGoal}
            onChange={(e) => setIsNumericGoal(e.target.checked)}
          />
          {t('tasks.numericGoal') || '🎯 Numeric Goal Tracking (e.g. 500 words, 30 pages)'}
        </label>
      </div>

      {isNumericGoal && (
        <div className={styles.row}>
          <div className={styles.selectGroup}>
            <label className={styles.label}>{t('tasks.targetAmount') || 'Target Amount'}</label>
            <input
              type="number"
              className={styles.select}
              placeholder="500"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.label}>{t('tasks.unit') || 'Unit'}</label>
            <input
              type="text"
              className={styles.select}
              placeholder={t('tasks.unitPlaceholder')}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className={styles.recurringToggle}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          {t('tasks.createRecurring') || '🔁 Create Recurring Task'}
        </label>
      </div>

      {!isRecurring && (
        <div className={styles.row}>
          <div className={styles.selectGroup}>
            <label className={styles.label}>{t('tasks.status') || 'Status'}</label>
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
            <label className={styles.label}>{t('tasks.deadlineOpt') || 'Deadline (optional)'}</label>
            <input
              type="date"
              className={styles.select}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      )}

      {isRecurring && (
        <>
          <div className={styles.row}>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('tasks.frequency') || 'Recurrence Frequency'}</label>
              <select
                className={styles.select}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              >
                <option value="daily">{t('tasks.freqDaily') || 'Daily'}</option>
                <option value="weekly">{t('tasks.freqWeekly') || 'Weekly'}</option>
                <option value="monthly">{t('tasks.freqMonthly') || 'Monthly'}</option>
              </select>
            </div>

            <div className={styles.selectGroup}>
              <label className={styles.label}>
                {t('tasks.interval') || 'Interval'} ({t('tasks.interval') || 'Every N'} {frequency})
              </label>
              <input
                type="number"
                min="1"
                className={styles.select}
                value={interval}
                onChange={(e) => setInterval_(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('tasks.weekdays') || 'Days of Week'}</label>
              <div className={styles.weekdays}>
                {WEEKDAYS.map((wd) => (
                  <button
                    key={wd.value}
                    type="button"
                    className={`${styles.weekdayBtn} ${
                      daysOfWeek.includes(wd.value) ? styles.active : ''
                    }`}
                    onClick={() => toggleDay(wd.value)}
                  >
                    {wd.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('tasks.startDate') || 'Start Date'}</label>
              <input
                type="date"
                className={styles.select}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className={styles.selectGroup}>
              <label className={styles.label}>{t('tasks.endDateOpt') || 'End Date (optional)'}</label>
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

      <div className={styles.selectGroup}>
        <label className={styles.label}>{t('tasks.priorityLevel') || 'Priority Level'}</label>
        <div className={styles.priorityGroup}>
          {(['low', 'medium', 'high', 'urgent', 'routine'] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.priorityBtn} ${priority === p ? styles.active : ''} ${
                styles[p]
              }`}
              onClick={() => setPriority(p)}
            >
              {t(`priority.${p}`) || (p.charAt(0).toUpperCase() + p.slice(1))}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('common.cancel') || 'Cancel'}
        </Button>
        <Button type="submit" variant="primary">
          {isRecurring
            ? t('tasks.createRecurringBtn') || 'Create Recurring Task'
            : t('tasks.addTask') || 'Add Task'}
        </Button>
      </div>
    </form>
  );
};
