'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Project } from '@/types';
import { getProjectProgress, ProgressStats } from '@/lib/progress';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './ProjectManager.module.css';

type ProjectSort = 'manual' | 'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc' | 'newest' | 'oldest';

const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'manual', label: 'Default Order' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'progress-desc', label: 'Progress (High-Low)' },
  { value: 'progress-asc', label: 'Progress (Low-High)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export const ProjectManager: React.FC = () => {
  const { projects, todos, addProject, updateProject, deleteProject, selectedProjectId, setSelectedProjectId } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('📁');
  const [sort, setSort] = useState<ProjectSort>('manual');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSortOpen]);

  const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  ];

  const ICONS = ['📁', '💼', '🏠', '🚀', '🎨', '💻', '📚', '🛠️', '🎯', '✨'];

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setName(project.name);
      setColor(project.color);
      setIcon(project.icon || '📁');
    } else {
      setEditingProject(null);
      setName('');
      setColor(PRESET_COLORS[0]);
      setIcon('📁');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingProject) {
      updateProject(editingProject.id, { name: name.trim(), color, icon });
    } else {
      addProject({
        name: name.trim(),
        color,
        icon,
      });
    }

    setIsModalOpen(false);
  };

  const projectsWithProgress: { project: Project; progress: ProgressStats }[] = projects.map((project) => ({
    project,
    progress: getProjectProgress(project.id, todos),
  }));

  const sortedProjects = (() => {
    const list = [...projectsWithProgress];
    switch (sort) {
      case 'name-asc':
        return list.sort((a, b) => a.project.name.localeCompare(b.project.name));
      case 'name-desc':
        return list.sort((a, b) => b.project.name.localeCompare(a.project.name));
      case 'progress-desc':
        return list.sort((a, b) => b.progress.percent - a.progress.percent);
      case 'progress-asc':
        return list.sort((a, b) => a.progress.percent - b.progress.percent);
      case 'newest':
        return list.sort((a, b) => new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime());
      case 'oldest':
        return list.sort((a, b) => new Date(a.project.createdAt).getTime() - new Date(b.project.createdAt).getTime());
      default:
        return list;
    }
  })();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Projects</h3>
        <div className={styles.headerActions}>
          {projects.length > 1 && (
            <div className={styles.sortMenuWrap} ref={sortMenuRef}>
              <button
                type="button"
                className={`${styles.iconBtn} ${sort !== 'manual' ? styles.iconBtnActive : ''}`}
                onClick={() => setIsSortOpen((o) => !o)}
                title="Sort projects"
                aria-label="Sort projects"
              >
                ⇅
              </button>
              {isSortOpen && (
                <div className={styles.sortMenu}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.sortMenuItem} ${sort === opt.value ? styles.sortMenuItemActive : ''}`}
                      onClick={() => {
                        setSort(opt.value);
                        setIsSortOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                      {sort === opt.value && <span className={styles.sortMenuCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className={styles.addBtn} onClick={() => handleOpenModal()} title="Add Project">
            +
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {sortedProjects.map(({ project, progress }) => {
          return (
          <div
            key={project.id}
            className={`${styles.item} ${selectedProjectId === project.id ? styles.selected : ''}`}
            style={{ '--item-color': project.color } as React.CSSProperties}
          >
            <button
              type="button"
              className={styles.info}
              onClick={() => {
                setSelectedProjectId(selectedProjectId === project.id ? null : project.id);
                document.getElementById('tasks-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              title={`Show ${project.name} tasks`}
            >
              <span className={styles.icon}>{project.icon}</span>
              <div className={styles.infoText}>
                <span className={styles.name} style={{ color: project.color }}>
                  {project.name}
                </span>
                {progress.total > 0 && (
                  <div className={styles.projectProgressRow}>
                    <div className={styles.projectProgressTrack}>
                      <div
                        className={styles.projectProgressFill}
                        style={{ width: `${progress.percent}%`, background: project.color }}
                      />
                    </div>
                    <span className={styles.projectProgressLabel}>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                )}
              </div>
            </button>
            <div className={styles.actions}>
              <button onClick={() => handleOpenModal(project)}>✏️</button>
              <button className={styles.deleteBtn} onClick={() => deleteProject(project.id)}>🗑️</button>
            </div>
          </div>
          );
        })}
        {projects.length === 0 && (
          <p className={styles.empty}>No projects yet</p>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'New Project'}
        size="sm"
      >
        <div className={styles.formSplit}>
          <div className={styles.iconPicker}>
             <label className={styles.label}>Icon</label>
             <div className={styles.iconGrid}>
                {ICONS.map(i => (
                  <button 
                    key={i} 
                    className={`${styles.iconBtn} ${icon === i ? styles.active : ''}`}
                    onClick={() => setIcon(i)}
                  >
                    {i}
                  </button>
                ))}
             </div>
          </div>
          <div className={styles.details}>
            <Input
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing, Personal"
              autoFocus
            />
            <div className={styles.colorPicker}>
              <label className={styles.label}>Color</label>
              <div className={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`${styles.colorBtn} ${color === c ? styles.active : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
           <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
           <Button variant="primary" onClick={handleSave}>
             {editingProject ? 'Update' : 'Create'} Project
           </Button>
        </div>
      </Modal>
    </div>
  );
};
