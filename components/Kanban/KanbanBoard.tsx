'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Todo } from '@/types';
import { TaskCard } from '@/components/TodoList/TaskCard';
import { TaskDetailDrawer } from '@/components/TodoList/TaskDetailModal';
import styles from './KanbanBoard.module.css';

export const KanbanBoard: React.FC = () => {
  const { todos, kanbanColumns, updateTodo, addTodo, selectedProjectId } = useApp();
  const { t } = useLanguage();

  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDragTaskId(taskId);
  };

  const handleDragEnd = () => {
    // Defer clearing so the click handler (which fires after dragend in most
    // browsers) can still see it and skip opening the drawer for this task.
    setTimeout(() => setDragTaskId(null), 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    updateTodo(taskId, { status: columnId });
  };

  const getTasksByStatus = (status: string): Todo[] => {
    return todos.filter(
      (todo) =>
        todo.status === status &&
        !todo.completed &&
        !todo.parentTodoId && // subtasks are tracked inside their parent task, not as their own kanban card
        (!selectedProjectId || todo.projectId === selectedProjectId)
    );
  };

  const handleAddTask = (columnId: string) => {
    if (!newTaskTitle.trim()) {
      setAddingColumnId(null);
      setNewTaskTitle('');
      return;
    }
    addTodo({
      title: newTaskTitle.trim(),
      priority: 'medium',
      status: columnId,
      projectId: selectedProjectId || undefined,
      completed: false,
    });
    setNewTaskTitle('');
  };

  const handleAddKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask(columnId);
    } else if (e.key === 'Escape') {
      setAddingColumnId(null);
      setNewTaskTitle('');
    }
  };

  return (
    <>
      <div className={styles.board}>
      {kanbanColumns
        .sort((a, b) => a.order - b.order)
        .map((column) => {
          const tasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className={styles.column}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div
                className={styles.columnHeader}
                style={{ background: `color-mix(in srgb, ${column.color} 12%, var(--color-bg-secondary))` }}
              >
                <span
                  className={styles.columnPill}
                  style={{ color: column.color, background: `color-mix(in srgb, ${column.color} 16%, transparent)` }}
                >
                  <span className={styles.columnDot} style={{ backgroundColor: column.color }} />
                  {column.name}
                </span>
                <span className={styles.taskCount}>{tasks.length}</span>
                <div className={styles.headerSpacer} />
                <button
                  type="button"
                  className={styles.headerAddBtn}
                  onClick={() => setAddingColumnId(column.id)}
                  title={t('tasks.addTask')}
                >
                  +
                </button>
              </div>

              <div className={styles.taskList}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    todo={task}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (dragTaskId === task.id) return; // was a drag, not a click
                      setSelectedTask(task);
                    }}
                  />
                ))}

                {addingColumnId === column.id ? (
                  <div className={styles.addTaskForm}>
                    <input
                      type="text"
                      className={styles.addTaskInput}
                      placeholder={`${t('tasks.title')}...`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => handleAddKeyDown(e, column.id)}
                      autoFocus
                    />
                    <div className={styles.addTaskActions}>
                      <button type="button" className={styles.addTaskCancel} onClick={() => { setAddingColumnId(null); setNewTaskTitle(''); }}>
                        {t('common.cancel')}
                      </button>
                      <button type="button" className={styles.addTaskSave} onClick={() => handleAddTask(column.id)}>
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.addTaskLink}
                    style={{ color: column.color }}
                    onClick={() => setAddingColumnId(column.id)}
                  >
                    + {t('tasks.addTask')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailDrawer
          todo={selectedTask}
          isOpen={true}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
};
