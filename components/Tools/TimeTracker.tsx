'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFocus } from '@/contexts/FocusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { TimeEntry, Todo } from '@/types';
import styles from './TimeTracker.module.css';

const toDateInputValue = (date: Date | string) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

interface FlatTodoOption {
  id: string;
  title: string;
  depth: number;
}

export const TimeTracker: React.FC = () => {
  const { projects, todos, timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useApp();
  const { isTimeTracking, trackingElapsedTime, trackingProjectId, trackingTaskId, startTracking, stopTracking, formatTime } = useFocus();
  const { t } = useLanguage();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');

  // Active project ID from focus context if currently tracking
  const activeProjectId = isTimeTracking ? (trackingProjectId || selectedProjectId) : selectedProjectId;
  const activeTaskId = isTimeTracking ? (trackingTaskId || selectedTaskId) : selectedTaskId;

  // Build hierarchical task tree for selected project
  const getProjectTaskOptions = (projId: string): FlatTodoOption[] => {
    if (!projId) return [];
    const projectTodos = todos.filter((t) => t.projectId === projId);
    const rootTodos = projectTodos.filter((t) => !t.parentTodoId);
    const result: FlatTodoOption[] = [];

    const traverse = (parentId: string, depth: number) => {
      const children = projectTodos.filter((t) => t.parentTodoId === parentId);
      for (const child of children) {
        result.push({ id: child.id, title: child.title, depth });
        traverse(child.id, depth + 1);
      }
    };

    for (const root of rootTodos) {
      result.push({ id: root.id, title: root.title, depth: 0 });
      traverse(root.id, 1);
    }

    const seenIds = new Set(result.map((r) => r.id));
    for (const item of projectTodos) {
      if (!seenIds.has(item.id)) {
        result.push({ id: item.id, title: item.title, depth: 0 });
      }
    }

    return result;
  };

  const currentTaskOptions = getProjectTaskOptions(activeProjectId);

  const toggleTracking = () => {
    if (isTimeTracking) {
      stopTracking();
    } else {
      if (!activeProjectId) {
        alert(t('tools.selectProjectFirst') || 'Please select a project first');
        return;
      }
      startTracking(activeProjectId, activeTaskId || undefined);
    }
  };

  const formatEntryDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getProjectName = (id: string) => {
    const project = projects.find((p) => p.id === id);
    return project ? project.name : 'General';
  };

  const getProjectColor = (id: string) => {
    const project = projects.find((p) => p.id === id);
    return project ? project.color : 'var(--color-text-tertiary)';
  };

  const openManualForm = () => {
    if (showManualForm) {
      setShowManualForm(false);
      return;
    }
    setManualProjectId(activeProjectId || projects[0]?.id || '');
    setManualDate(toDateInputValue(new Date()));
    setManualHours('');
    setManualMinutes('');
    setShowManualForm(true);
  };

  const handleAddManual = () => {
    if (!manualProjectId) {
      alert(t('tools.selectProjectFirst') || 'Please select a project first');
      return;
    }
    const hours = parseInt(manualHours, 10) || 0;
    const minutes = parseInt(manualMinutes, 10) || 0;
    const duration = hours * 3600 + minutes * 60;
    if (duration <= 0) {
      alert('Please enter a duration greater than 0');
      return;
    }
    const createdAt = manualDate ? new Date(`${manualDate}T12:00:00`) : new Date();
    addTimeEntry({
      projectId: manualProjectId,
      duration,
      createdAt,
    });
    setShowManualForm(false);
    setManualHours('');
    setManualMinutes('');
  };

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditDate(toDateInputValue(entry.createdAt));
    setEditHours(String(Math.floor(entry.duration / 3600)));
    setEditMinutes(String(Math.floor((entry.duration % 3600) / 60)));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const hours = parseInt(editHours, 10) || 0;
    const minutes = parseInt(editMinutes, 10) || 0;
    const duration = hours * 3600 + minutes * 60;
    if (duration <= 0) {
      alert('Please enter a duration greater than 0');
      return;
    }
    const createdAt = editDate ? new Date(`${editDate}T12:00:00`) : new Date();
    updateTimeEntry(id, { duration, createdAt });
    setEditingId(null);
  };

  const projectTotalDuration = timeEntries
    .filter((e) => (activeProjectId ? e.projectId === activeProjectId : true))
    .reduce((acc, curr) => acc + (curr.duration || 0), 0);

  return (
    <div className={styles.container} id="time-tracker-section">
      <div className={styles.header}>
        <h3 className={styles.title}>{t('tools.timeTracker')}</h3>
        {isTimeTracking && <span className={styles.liveIndicator}>LIVE</span>}
      </div>

      <div className={styles.trackerCard}>
        {/* Project Selector */}
        <select
          className={styles.projectSelect}
          value={activeProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setSelectedTaskId('');
          }}
          disabled={isTimeTracking}
        >
          <option value="">{t('tasks.selectProject') || 'Select Project...'}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>

        {/* Hierarchical Task Selector (Image 2) */}
        {activeProjectId && currentTaskOptions.length > 0 && (
          <select
            className={styles.projectSelect}
            value={activeTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isTimeTracking}
            style={{ marginTop: '6px' }}
          >
            <option value="">📋 {t('tasks.allTasks') || 'All Tasks (Project Level)'}</option>
            {currentTaskOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {'\u00A0\u00A0'.repeat(opt.depth)}
                {opt.depth > 0 ? '↳ ' : ''}
                {opt.title}
              </option>
            ))}
          </select>
        )}

        <div className={styles.timeDisplay}>
          {formatTime(isTimeTracking ? trackingElapsedTime : 0)}
        </div>

        {activeProjectId && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '8px', textAlign: 'center' }}>
            {t('analytics.totalLogged') || 'Total Logged'}: {formatTime(projectTotalDuration)}
          </div>
        )}

        <Button
          variant={isTimeTracking ? 'danger' : 'primary'}
          onClick={toggleTracking}
          className={styles.trackBtn}
        >
          {isTimeTracking ? t('tools.stopTracking') : t('tools.startTracking')}
        </Button>

        <button
          type="button"
          className={styles.manualToggle}
          onClick={openManualForm}
          disabled={isTimeTracking}
        >
          {showManualForm ? t('common.cancel') : `+ ${t('tools.addTimeManually') || 'Add time manually'}`}
        </button>

        {showManualForm && (
          <div className={styles.manualForm}>
            <select
              className={styles.projectSelect}
              value={manualProjectId}
              onChange={(e) => setManualProjectId(e.target.value)}
            >
              <option value="">{t('tasks.selectProject') || 'Select Project...'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className={styles.manualDateInput}
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
            <div className={styles.manualRow}>
              <input
                type="number"
                min="0"
                placeholder="h"
                className={styles.manualNumInput}
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="59"
                placeholder="m"
                className={styles.manualNumInput}
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={handleAddManual} className={styles.trackBtn}>
              {t('common.save') || 'Add Entry'}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.history}>
        <h4 className={styles.historyTitle}>{t('tools.recentEntries') || 'Recent Entries'}</h4>
        <div className={styles.entryList}>
          {timeEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} className={styles.entryItem}>
              {editingId === entry.id ? (
                <div className={styles.editBlock}>
                  <input
                    type="date"
                    className={styles.editDateInput}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <div className={styles.editRow}>
                    <input
                      type="number"
                      min="0"
                      placeholder="h"
                      className={styles.editNumInput}
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="m"
                      className={styles.editNumInput}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                    />
                    <button
                      className={styles.saveBtn}
                      onClick={() => saveEdit(entry.id)}
                      title={t('common.save')}
                    >
                      ✓
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={cancelEdit}
                      title={t('common.cancel')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.entryInfo}>
                    <span
                      className={styles.projectDot}
                      style={{ backgroundColor: getProjectColor(entry.projectId) }}
                    />
                    <span className={styles.entryName}>{getProjectName(entry.projectId)}</span>
                    <span className={styles.entryDate}>{formatEntryDate(entry.createdAt)}</span>
                  </div>
                  <div className={styles.entryMeta}>
                    <span className={styles.entryDuration}>{formatTime(entry.duration)}</span>
                    <button
                      className={styles.editBtn}
                      onClick={() => startEdit(entry)}
                      title={t('common.edit')}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteTimeEntry(entry.id)}
                      title={t('common.delete')}
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {timeEntries.length === 0 && (
            <p className={styles.emptyText}>{t('tools.noEntries') || 'No entries yet'}</p>
          )}
        </div>
      </div>
    </div>
  );
};
