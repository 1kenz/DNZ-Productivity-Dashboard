'use client';

import React, { useState } from 'react';
import { Todo, Priority } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodoProgress } from '@/lib/progress';
import { PRIORITY_ORDER, PRIORITY_META } from '@/lib/priority';
import styles from './TaskDetailModal.module.css';

interface TaskDetailDrawerProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ todo, isOpen, onClose }) => {
  const { updateTodo, addTodo, deleteTodo, toggleTodo, projects, sections, kanbanColumns, todos } = useApp();
  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || '');
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [projectId, setProjectId] = useState(todo.projectId || '');
  const [sectionId, setSectionId] = useState(todo.sectionId || '');
  const [deadline, setDeadline] = useState(todo.deadline ? new Date(todo.deadline).toISOString().split('T')[0] : '');
  const [status, setStatus] = useState(todo.status);

  // Numeric goal (e.g. "500 kelime") — an alternative to the plain checkbox.
  const [targetCount, setTargetCount] = useState(todo.targetCount != null ? String(todo.targetCount) : '');
  const [currentCount, setCurrentCount] = useState(todo.currentCount != null ? String(todo.currentCount) : '');
  const [unit, setUnit] = useState(todo.unit || '');

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [openSubtaskId, setOpenSubtaskId] = useState<string | null>(null);

  const subtasks = todos.filter((t) => t.parentTodoId === todo.id);
  const subtaskProgress = getTodoProgress(todo, todos);
  const isParentOfSubtasks = subtasks.length > 0;
  const parentTodo = todo.parentTodoId ? todos.find((t) => t.id === todo.parentTodoId) : null;
  const parentStatusColor = parentTodo
    ? kanbanColumns.find((c) => c.id === parentTodo.status)?.color || 'var(--color-text-tertiary)'
    : undefined;

  const handleSave = () => {
    updateTodo(todo.id, {
      title,
      description: description || undefined,
      priority,
      projectId: projectId || undefined,
      sectionId: sectionId || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      status,
      targetCount: targetCount ? Math.max(0, parseInt(targetCount, 10) || 0) : undefined,
      currentCount: targetCount ? Math.max(0, parseInt(currentCount, 10) || 0) : undefined,
      unit: targetCount ? (unit || undefined) : undefined,
    });
    onClose();
  };

  const handleAddSubtask = () => {
    const t = newSubtaskTitle.trim();
    if (!t) return;
    addTodo({
      title: t,
      priority: 'medium',
      projectId: todo.projectId,
      sectionId: todo.sectionId,
      parentTodoId: todo.id,
      status: kanbanColumns[0]?.id || 'todo',
      completed: false,
    });
    setNewSubtaskTitle('');
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Task Details">
      <div className={styles.container}>
        {parentTodo && (
          <button
            type="button"
            className={styles.parentBreadcrumb}
            onClick={() => setOpenParentId(parentTodo.id)}
            title="Open the parent task"
          >
            Subtask of
            <span className={styles.parentDot} style={{ backgroundColor: parentStatusColor }} />
            <span className={styles.parentName}>{parentTodo.title}</span>
          </button>
        )}

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
              onChange={(e) => {
                setProjectId(e.target.value);
                setSectionId(''); // sections belong to a single project
              }}
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {projectId && sections.some((s) => s.projectId === projectId) && (
            <div className={styles.field}>
              <label className={styles.label}>Section</label>
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
              {PRIORITY_ORDER.slice().reverse().map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].icon} {PRIORITY_META[p].label}
                </option>
              ))}
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

        {!isParentOfSubtasks && (
          <div className={styles.section}>
            <label className={styles.label}>Numeric Goal (optional)</label>
            <p className={styles.hint}>
              Track progress by count instead of a plain checkbox — e.g. "500 kelime".
            </p>
            <div className={styles.goalRow}>
              <div className={styles.goalField}>
                <span className={styles.goalFieldLabel}>Current</span>
                <input
                  type="number"
                  min="0"
                  className={styles.goalInput}
                  placeholder="0"
                  value={currentCount}
                  onChange={(e) => setCurrentCount(e.target.value)}
                />
              </div>
              <span className={styles.goalSep}>/</span>
              <div className={styles.goalField}>
                <span className={styles.goalFieldLabel}>Target</span>
                <input
                  type="number"
                  min="0"
                  className={styles.goalInput}
                  placeholder="0"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                />
              </div>
              <div className={`${styles.goalField} ${styles.goalFieldWide}`}>
                <span className={styles.goalFieldLabel}>Unit</span>
                <input
                  type="text"
                  className={styles.goalUnitInput}
                  placeholder="kelime, sayfa..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <label className={styles.label}>
            Checklists
            {subtasks.length > 0 && ` — ${subtaskProgress.completed}/${subtaskProgress.total}`}
          </label>
          {subtasks.length > 0 && (
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${subtaskProgress.percent}%` }} />
            </div>
          )}
          <div className={styles.checklistWrap}>
            {subtasks.map((st) => {
              const grandchildren = todos.filter((t) => t.parentTodoId === st.id);
              const stStatusColor = kanbanColumns.find((c) => c.id === st.status)?.color || 'var(--color-text-tertiary)';
              const stProjectColor = projects.find((p) => p.id === st.projectId)?.color;
              const checkboxColor = stProjectColor || stStatusColor;

              // Childless subtask -- a plain checklist row, no group chrome.
              if (grandchildren.length === 0) {
                return (
                  <div key={st.id} className={styles.checklistItem}>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleTodo(st.id)}
                      className={styles.checklistCheckbox}
                      style={{ '--checkbox-color': checkboxColor } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      className={`${styles.checklistTitle} ${st.completed ? styles.checklistDone : ''}`}
                      onClick={() => setOpenSubtaskId(st.id)}
                      title="Open this subtask — add its own subtasks, set a deadline, etc."
                    >
                      {st.title}
                      {st.description && (
                        <span className={styles.checklistDescIcon} title="Has a description">≡</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.checklistDeleteBtn}
                      onClick={() => deleteTodo(st.id)}
                      title="Delete subtask"
                    >
                      ×
                    </button>
                  </div>
                );
              }

              // Has its own children -- render as a mini checklist group with
              // its own completed/total ratio, ClickUp-style.
              const groupProgress = getTodoProgress(st, todos);
              return (
                <div key={st.id} className={styles.checklistGroup}>
                  <div className={styles.checklistGroupHeader}>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleTodo(st.id)}
                      className={styles.checklistCheckbox}
                      style={{ '--checkbox-color': checkboxColor } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      className={`${styles.checklistGroupTitle} ${st.completed ? styles.checklistDone : ''}`}
                      onClick={() => setOpenSubtaskId(st.id)}
                      title="Open this subtask — add its own subtasks, set a deadline, etc."
                    >
                      {st.title}
                    </button>
                    <span className={styles.checklistGroupRatio}>
                      {groupProgress.completed}/{groupProgress.total}
                    </span>
                    <button
                      type="button"
                      className={styles.checklistDeleteBtn}
                      onClick={() => deleteTodo(st.id)}
                      title="Delete subtask"
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.checklistGroupBody}>
                    {grandchildren.map((gc) => {
                      const gcStatusColor = kanbanColumns.find((c) => c.id === gc.status)?.color || 'var(--color-text-tertiary)';
                      const gcProjectColor = projects.find((p) => p.id === gc.projectId)?.color;
                      const gcCheckboxColor = gcProjectColor || gcStatusColor;
                      return (
                        <div key={gc.id} className={styles.checklistItem}>
                          <input
                            type="checkbox"
                            checked={gc.completed}
                            onChange={() => toggleTodo(gc.id)}
                            className={styles.checklistCheckbox}
                            style={{ '--checkbox-color': gcCheckboxColor } as React.CSSProperties}
                          />
                          <button
                            type="button"
                            className={`${styles.checklistTitle} ${gc.completed ? styles.checklistDone : ''}`}
                            onClick={() => setOpenSubtaskId(gc.id)}
                            title="Open this subtask"
                          >
                            {gc.title}
                            {gc.description && (
                              <span className={styles.checklistDescIcon} title="Has a description">≡</span>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.checklistDeleteBtn}
                            onClick={() => deleteTodo(gc.id)}
                            title="Delete subtask"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.subtaskAddRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="Add a microtask..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
            />
            <Button type="button" variant="secondary" onClick={handleAddSubtask}>
              + Add
            </Button>
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

      {(() => {
        const openSubtask = openSubtaskId ? todos.find((t) => t.id === openSubtaskId) : null;
        return openSubtask ? (
          <TaskDetailDrawer todo={openSubtask} isOpen={true} onClose={() => setOpenSubtaskId(null)} />
        ) : null;
      })()}

      {parentTodo && (
        <TaskDetailDrawer
          todo={parentTodo}
          isOpen={openParentId === parentTodo.id}
          onClose={() => setOpenParentId(null)}
        />
      )}
    </Drawer>
  );
};
