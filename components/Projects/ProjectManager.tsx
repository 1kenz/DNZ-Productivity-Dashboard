'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Project } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './ProjectManager.module.css';

export const ProjectManager: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, selectedProjectId, setSelectedProjectId } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('📁');

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Projects</h3>
        <button className={styles.addBtn} onClick={() => handleOpenModal()} title="Add Project">
          +
        </button>
      </div>

      <div className={styles.list}>
        {projects.map((project) => (
          <div
            key={project.id}
            className={`${styles.item} ${selectedProjectId === project.id ? styles.selected : ''}`}
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
              <span className={styles.name} style={{ color: project.color }}>
                {project.name}
              </span>
            </button>
            <div className={styles.actions}>
              <button onClick={() => handleOpenModal(project)}>✏️</button>
              <button className={styles.deleteBtn} onClick={() => deleteProject(project.id)}>🗑️</button>
            </div>
          </div>
        ))}
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
