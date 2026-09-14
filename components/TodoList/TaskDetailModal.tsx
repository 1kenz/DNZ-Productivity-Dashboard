'use client';

import React, { useState } from 'react';
import { Todo, Priority } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './TaskDetailModal.module.css';

interface TaskDetailDrawerProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ todo, isOpen, onClose }) => {
  const { updateTodo, projects, kanbanColumns } = useApp();
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || '');
  const [priority, setPriority] = useState<any>(todo.priority);
  const [projectId, setProjectId] = useState(todo.projectId || '');
  const [deadline, setDeadline] = useState(todo.deadline ? new Date(todo.deadline).toISOString().split('T')[0] : '');
  const [status, setStatus] = useState(todo.status);

  const handleSave = () => {
    updateTodo(todo.id, {
      title,
      description: description || undefined,
      priority,
      projectId: projectId || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      status,
    });
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Task Details">
      <div className={styles.container}>
        <div className={styles.section}>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detailed notes here..."
          />
        </div>

        <div className={styles.verticalFields}>
          <div className={styles.field}>
            <label className={styles.label}>Project</label>
            <select
              className={styles.select}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {kanbanColumns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select
              className={styles.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="routine">Routine</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Deadline</label>
            <input
              type="date"
              className={styles.input}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.drawerFooter}>
          <span className={styles.timestamp}>
            Created: {new Date(todo.createdAt).toLocaleString()}
          </span>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
