'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { TimeEntry } from '@/types';
import styles from './TimeTracker.module.css';

const toDateInputValue = (date: Date | string) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export const TimeTracker: React.FC = () => {
  const { projects, addTimeEntry, updateTimeEntry, timeEntries, deleteTimeEntry } = useApp();
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');

  useEffect(() => {
    if (isTracking && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking, startTime]);

  const toggleTracking = () => {
    if (isTracking) {
      // Stop tracking
      if (elapsedTime > 0 && selectedProjectId) {
        addTimeEntry({
          projectId: selectedProjectId,
          duration: elapsedTime,
          createdAt: new Date(),
        });
      }
      setIsTracking(false);
      setStartTime(null);
      setElapsedTime(0);
    } else {
      // Start tracking
      if (!selectedProjectId) {
        alert('Please select a project first');
        return;
      }
      setIsTracking(true);
      setStartTime(Date.now());
      setElapsedTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEntryDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getProjectName = (id: string) => {
    const project = projects.find(p => p.id === id);
    return project ? project.name : 'Personal';
  };

  const getProjectColor = (id: string) => {
    const project = projects.find(p => p.id === id);
    return project ? project.color : 'var(--color-text-tertiary)';
  };

  const openManualForm = () => {
    if (showManualForm) {
      setShowManualForm(false);
      return;
    }
    setManualProjectId(selectedProjectId);
    setManualDate(toDateInputValue(new Date()));
    setManualHours('');
    setManualMinutes('');
    setShowManualForm(true);
  };

  const handleAddManual = () => {
    if (!manualProjectId) {
      alert('Please select a project first');
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

  return (
    <div className={styles.container} id="time-tracker-section">
      <div className={styles.header}>
        <h3 className={styles.title}>Time Tracker</h3>
        {isTracking && <span className={styles.liveIndicator}>LIVE</span>}
      </div>

      <div className={styles.trackerCard}>
        <select 
          className={styles.projectSelect}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={isTracking}
        >
          <option value="">Select Project...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
          ))}
        </select>

        <div className={styles.timeDisplay}>
          {formatTime(elapsedTime)}
        </div>

        <Button 
          variant={isTracking ? 'danger' : 'primary'}
          onClick={toggleTracking}
          className={styles.trackBtn}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </Button>

        <button
          type="button"
          className={styles.manualToggle}
          onClick={openManualForm}
          disabled={isTracking}
        >
          {showManualForm ? 'Cancel manual entry' : '+ Add time manually'}
        </button>

        {showManualForm && (
          <div className={styles.manualForm}>
            <select
              className={styles.projectSelect}
              value={manualProjectId}
              onChange={(e) => setManualProjectId(e.target.value)}
            >
              <option value="">Select Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
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
              Add Entry
            </Button>
          </div>
        )}
      </div>

      <div className={styles.history}>
        <h4 className={styles.historyTitle}>Recent Entries</h4>
        <div className={styles.entryList}>
          {timeEntries.slice(0, 5).map(entry => (
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
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={cancelEdit}
                      title="Cancel"
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
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => deleteTimeEntry(entry.id)}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {timeEntries.length === 0 && (
            <p className={styles.emptyText}>No entries yet</p>
          )}
        </div>
      </div>
    </div>
  );
};
