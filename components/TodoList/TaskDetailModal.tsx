'use client';

import React, { useState } from 'react';
import { Todo, Priority } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppPicker } from '@/components/QuickLinks/AppPicker';
import { fileDropHandlers, fileNameFromPath } from '@/lib/electron';
import { getTodoProgress } from '@/lib/progress';
import { PRIORITY_ORDER, PRIORITY_META } from '@/lib/priority';
import { AskAiButton } from './AskAiButton';
import styles from './TaskDetailModal.module.css';

interface TaskDetailDrawerProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ todo, isOpen, onClose }) => {
  const { updateTodo, addTodo, deleteTodo, toggleTodo, projects, sections, kanbanColumns, todos, addAttachment, deleteAttachment, openLocalPath } = useApp();
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
      priority: todo.priority,
      projectId: todo.projectId,
      sectionId: todo.sectionId,
      domain: todo.domain,
      tags: todo.tags ? [...todo.tags] : undefined,
      parentTodoId: todo.id,
      status: kanbanColumns[0]?.id || 'todo',
      completed: false,
    });
    setNewSubtaskTitle('');
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Stop this from also bubbling up to the modal's own Enter-to-save
      // handler -- Enter here should only add the subtask.
      e.stopPropagation();
      handleAddSubtask();
    }
  };

  // Attachments: local documents/programs (on the user's own computer)
  // linked to this task for quick access, opened via the OS "open" command.
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');
  const [newAttachmentPath, setNewAttachmentPath] = useState('');
  const [attachmentPickerAnchor, setAttachmentPickerAnchor] = useState<HTMLElement | null>(null);
  const attachments = todos.find((t) => t.id === todo.id)?.attachments || [];

  const handleAddAttachment = () => {
    const label = newAttachmentLabel.trim();
    const path = newAttachmentPath.trim();
    if (!label || !path) return;
    addAttachment({ label, path, todoId: todo.id });
    setNewAttachmentLabel('');
    setNewAttachmentPath('');
  };

  const handleAttachmentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddAttachment();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} onConfirm={handleSave} title={t('tasks.details') || 'Task Details'} size="lg">
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
          <div className={styles.sectionHeaderRow}>
            <label className={styles.label}>{t('tasks.description')}</label>
            <AskAiButton taskTitle={title || todo.title} />
          </div>
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
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
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
            <label className={styles.label}>{t('tasks.numericGoalTitle')}</label>
            <p className={styles.hint}>
              {t('tasks.numericGoalHint')}
            </p>
            <div className={styles.goalRow}>
              <div className={styles.goalField}>
                <span className={styles.goalFieldLabel}>{t('tasks.current')}</span>
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
                <span className={styles.goalFieldLabel}>{t('tasks.target')}</span>
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
                <span className={styles.goalFieldLabel}>{t('tasks.unitLabel')}</span>
                <input
                  type="text"
                  className={styles.goalInput}
                  placeholder={t('tasks.unitPlaceholder')}
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

        <div className={styles.subtaskSection}>
          <div className={styles.subtaskHeader}>
            <span className={styles.label}>📎 {t('attachments.title')}</span>
          </div>
          <p className={styles.hint}>{t('attachments.hint')}</p>

          {attachments.length > 0 && (
            <div className={styles.subtaskList}>
              {attachments.map((a) => (
                <div key={a.id} className={styles.subtaskItem}>
                  <div className={styles.attachmentInfo}>
                    <span className={styles.attachmentLabel}>{a.label}</span>
                    <span className={styles.attachmentPath}>{a.path}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.checklistDeleteBtn}
                    onClick={() => openLocalPath(a.path)}
                    title={t('attachments.open')}
                  >
                    📂
                  </button>
                  <button
                    type="button"
                    className={styles.checklistDeleteBtn}
                    onClick={() => {
                      if (window.confirm(t('attachments.deleteConfirm') || 'Remove this attachment?')) {
                        deleteAttachment(a.id, { todoId: todo.id });
                      }
                    }}
                    title={t('common.delete') || 'Delete attachment'}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.subtaskAddRow}>
            <input
              type="text"
              className={styles.input}
              placeholder={t('attachments.labelPlaceholder')}
              value={newAttachmentLabel}
              onChange={(e) => setNewAttachmentLabel(e.target.value)}
              onKeyDown={handleAttachmentKeyDown}
            />
            <input
              type="text"
              className={styles.input}
              placeholder={t('attachments.pathPlaceholder')}
              value={newAttachmentPath}
              onChange={(e) => setNewAttachmentPath(e.target.value)}
              onKeyDown={handleAttachmentKeyDown}
              {...fileDropHandlers((path) => {
                setNewAttachmentPath(path);
                if (!newAttachmentLabel.trim()) setNewAttachmentLabel(fileNameFromPath(path));
              })}
            />
            <div className={styles.appPickerAnchor}>
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => setAttachmentPickerAnchor((prev) => (prev ? null : e.currentTarget))}
                title={t('quickLinks.chooseApp')}
              >
                📱
              </Button>
              {attachmentPickerAnchor && (
                <AppPicker
                  anchorEl={attachmentPickerAnchor}
                  onSelect={(app) => {
                    setNewAttachmentLabel(app.name);
                    setNewAttachmentPath(app.path);
                    setAttachmentPickerAnchor(null);
                  }}
                  onClose={() => setAttachmentPickerAnchor(null)}
                />
              )}
            </div>
            <Button type="button" variant="secondary" onClick={handleAddAttachment}>
              + {t('common.add')}
            </Button>
          </div>
        </div>

        <div className={styles.drawerFooter}>
          <span className={styles.timestamp}>
            Created: {new Date(todo.createdAt).toLocaleString()}
          </span>
          <div className={styles.actions}>
            <Button variant="danger" size="sm" onClick={handleDeleteTask}>
              {t('common.delete') || 'Delete'}
            </Button>
            <div className={styles.primaryActions}>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                {t('common.save')}
              </Button>
            </div>
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
