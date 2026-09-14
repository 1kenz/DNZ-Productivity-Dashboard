'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Todo } from '@/types';
import { TaskDetailDrawer } from '@/components/TodoList/TaskDetailModal';
import styles from './KanbanBoard.module.css';

export const KanbanBoard: React.FC = () => {
  const { todos, kanbanColumns, updateTodo, projects, selectedProjectId } = useApp();
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

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
        (!selectedProjectId || todo.projectId === selectedProjectId)
    );
  };

  const priorityColors = {
    high: 'var(--color-error)',
    medium: 'var(--color-warning)',
    low: 'var(--color-success)',
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
              <div className={styles.columnHeader} style={{ borderTopColor: column.color }}>
                <h3 className={styles.columnTitle}>{column.name}</h3>
                <span className={styles.taskCount}>{tasks.length}</span>
              </div>

              <div className={styles.taskList}>
                {tasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  return (
                    <div
                      key={task.id}
                      className={styles.taskCard}
                      style={project ? { borderLeftColor: project.color } : undefined}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (dragTaskId === task.id) return; // was a drag, not a click
                        setSelectedTask(task);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTask(task);
                        }
                      }}
                    >
                      <div className={styles.taskHeader}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <div
                          className={styles.priorityDot}
                          style={{ backgroundColor: priorityColors[task.priority] }}
                          title={task.priority}
                        />
                      </div>
                      {task.description && (
                        <p className={styles.taskDescription}>{task.description}</p>
                      )}
                      {(project || task.deadline) && (
                        <div className={styles.taskMeta}>
                          {project && (
                            <span className={styles.metaTag} style={{ color: project.color }}>
                              {project.icon} {project.name}
                            </span>
                          )}
                          {task.deadline && (
                            <span className={styles.metaTag}>
                              ⏰ {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <div className={styles.emptyColumn}>No tasks</div>
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
