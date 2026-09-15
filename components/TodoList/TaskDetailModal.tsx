'use client';

import React, { useState } from 'react';
import { Todo, Priority } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
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
  const { t } = useLanguage();

  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || '');
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [projectId, setProjectId] = useState(todo.projectId || '');
  const [sectionId, setSectionId] = useState(todo.sectionId || '');
  const [deadline, setDeadline] = useState(todo.deadline ? new Date(todo.deadline).toISOString().split('T')[0] : '');
  const [status, setStatus] = useState(todo.status);

  // Numeric goal
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

  const handleDeleteTask = () => {
    const confirmMsg = t('tasks.deleteTaskConfirm') || 'Bu görevi silmek istediğinize emin misiniz?';
    const message = todo.title ? `"${todo.title}"\n\n${confirmMsg}` : confirmMsg;
    if (window.confirm(message)) {
      deleteTodo(todo.id);
      onClose();
    }
  };

  const handleDeleteSubtask = (stId: string, stTitle?: string) => {
    const confirmMsg = t('tasks.deleteTaskConfirm') || 'Bu görevi silmek istediğinize emin misiniz?';
    const message = stTitle ? `"${stTitle}"\n\n${confirmMsg}` : confirmMsg;
    if (window.confirm(message)) {
      deleteTodo(stId);
    }
  };

  const handleAddSubtask = () => {
    const tVal = newSubtaskTitle.trim();
    if (!tVal) return;
    addTodo({
      title: tVal,
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('tasks.details') || 'Task Details'} size="lg">
      <div className={styles.container}>
        {parentTodo && (
          <button
            type="button"
            className={styles.parentBreadcrumb}
            onClick={() => setOpenParentId(parentTodo.id)}
            title="Open parent task"
          >
            Subtask of:
            <span className={styles.parentDot} style={{ backgroundColor: parentStatusColor }} />
            <span className={styles.parentName}>{parentTodo.title}</span>
          </button>
        )}

        <div className={styles.section}>
          <Input
            label={t('tasks.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('tasks.description')}</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detailed notes here..."
          />
        </div>

        <div className={styles.verticalFields}>
          <div className={styles.field}>
            <label className={styles.label}>{t('nav.projects')}</label>
            <select
              className={styles.select}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSectionId('');
              }}
            >
              <option value="">{t('projects.allProjects') || 'No Project'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {projectId && sections.some((s) => s.projectId === projectId) && (
            <div className={styles.field}>
              <label className={styles.label}>{t('tasks.sections')}</label>
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
            <label className={styles.label}>{t('tasks.status')}</label>
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
            <label className={styles.label}>{t('tasks.priority')}</label>
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
            <label className={styles.label}>{t('tasks.deadline')}</label>
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
                  min="1"
                  className={styles.goalInput}
                  placeholder="100"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                />
              </div>
              <div className={styles.goalField}>
                <span className={styles.goalFieldLabel}>Unit</span>
                <input
                  type="text"
                  className={styles.goalInput}
                  placeholder="kelime / sayfa"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.subtaskSection}>
          <div className={styles.subtaskHeader}>
            <span className={styles.label}>{t('tasks.subtasks')}</span>
            {subtasks.length > 0 && (
              <span className={styles.subtaskRatio}>
                {subtaskProgress.completed}/{subtaskProgress.total} ({subtaskProgress.percent}%)
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className={styles.subtaskProgressBar}>
              <div
                className={styles.subtaskProgressFill}
                style={{ width: `${subtaskProgress.percent}%` }}
              />
            </div>
          )}

          <div className={styles.subtaskList}>
            {subtasks.map((st) => {
              const statusCol = kanbanColumns.find((c) => c.id === st.status);
              const grandChildren = todos.filter((t) => t.parentTodoId === st.id);

              return (
                <div key={st.id} className={styles.subtaskBlock}>
                  <div className={styles.subtaskItem}>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleTodo(st.id)}
                      className={styles.checklistCheckbox}
                      aria-label="Toggle subtask completion"
                    />
                    <button
                      type="button"
                      className={`${styles.checklistText} ${st.completed ? styles.completed : ''}`}
                      onClick={() => setOpenSubtaskId(st.id)}
                      title="Open microtask details"
                    >
                      <span>{st.title}</span>
                      {statusCol && (
                        <span
                          className={styles.statusPill}
                          style={{
                            color: statusCol.color,
                            backgroundColor: `color-mix(in srgb, ${statusCol.color} 15%, transparent)`,
                          }}
                        >
                          {statusCol.name}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.checklistDeleteBtn}
                      onClick={() => handleDeleteSubtask(st.id, st.title)}
                      title={t('common.delete') || 'Delete subtask'}
                    >
                      ×
                    </button>
                  </div>

                  {grandChildren.length > 0 && (
                    <div className={styles.grandChildrenList}>
                      {grandChildren.map((gc) => {
                        const gcStatusCol = kanbanColumns.find((c) => c.id === gc.status);
                        return (
                          <div key={gc.id} className={styles.subtaskItem}>
                            <input
                              type="checkbox"
                              checked={gc.completed}
                              onChange={() => toggleTodo(gc.id)}
                              className={styles.checklistCheckbox}
                              aria-label="Toggle nested microtask completion"
                            />
                            <button
                              type="button"
                              className={`${styles.checklistText} ${gc.completed ? styles.completed : ''}`}
                              onClick={() => setOpenSubtaskId(gc.id)}
                              title="Open microtask details"
                            >
                              <span>{gc.title}</span>
                              {gcStatusCol && (
                                <span
                                  className={styles.statusPill}
                                  style={{
                                    color: gcStatusCol.color,
                                    backgroundColor: `color-mix(in srgb, ${gcStatusCol.color} 15%, transparent)`,
                                  }}
                                >
                                  {gcStatusCol.name}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              className={styles.checklistDeleteBtn}
                              onClick={() => handleDeleteSubtask(gc.id, gc.title)}
                              title={t('common.delete') || 'Delete subtask'}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
            <Button variant="danger" onClick={handleDeleteTask}>
              {t('common.delete') || 'Delete'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {t('common.save')}
            </Button>
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
    </Modal>
  );
};
