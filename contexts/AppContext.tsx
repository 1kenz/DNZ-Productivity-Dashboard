'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import {
  Todo,
  LinkGroup,
  Project,
  Section,
  RecurringTask,
  KanbanColumn,
  ViewPreferences,
  Clock,
  TimeEntry,
  Note,
  QuickLink,
  DomainArea,
  FocusLevel,
  ThemeMode,
  Theme,
} from '@/types';
import * as todoActions from '@/app/actions/todo';
import * as projectActions from '@/app/actions/project';
import * as sectionActions from '@/app/actions/section';
import * as recurringActions from '@/app/actions/recurring';
import * as kanbanActions from '@/app/actions/kanban';
import * as clockActions from '@/app/actions/clock';
import * as linkActions from '@/app/actions/link';
import * as noteActions from '@/app/actions/note';
import * as timeActions from '@/app/actions/time';
import * as settingsActions from '@/app/actions/settings';
import { FocusProvider } from './FocusContext';

interface AppContextType {
  // Loading state
  isLoading: boolean;

  // Todos
  todos: Todo[];
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;

  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Sections
  sections: Section[];
  addSection: (section: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;

  // Recurring Tasks
  recurringTasks: RecurringTask[];
  addRecurringTask: (task: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'lastRunDate'>) => void;
  updateRecurringTask: (id: string, updates: Partial<RecurringTask>) => void;
  deleteRecurringTask: (id: string) => void;

  // Clocks
  clocks: Clock[];
  addClock: (clock: Omit<Clock, 'id'>) => void;
  updateClock: (id: string, updates: Partial<Clock>) => void;
  deleteClock: (id: string) => void;
  reorderClocks: (newClocks: Clock[]) => void;

  // Time Tracking
  timeEntries: TimeEntry[];
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;

  // Kanban Columns
  kanbanColumns: KanbanColumn[];
  addKanbanColumn: (column: Omit<KanbanColumn, 'id'>) => void;
  updateKanbanColumn: (id: string, updates: Partial<KanbanColumn>) => void;
  deleteKanbanColumn: (id: string) => void;

  // Link Groups
  linkGroups: LinkGroup[];
  addLinkGroup: (group: Omit<LinkGroup, 'id' | 'links'>) => void;
  updateLinkGroup: (id: string, updates: Partial<LinkGroup>) => void;
  deleteLinkGroup: (id: string) => void;
  addLink: (link: Omit<QuickLink, 'id'>) => void;
  updateLink: (id: string, updates: Partial<QuickLink>) => void;
  deleteLink: (id: string) => void;
  reorderLinks: (groupId: string, links: QuickLink[]) => void;

  // Notes
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Theme
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // View Preferences
  viewPreferences: ViewPreferences;
  updateViewPreferences: (updates: Partial<ViewPreferences>) => void;

  // Focus Mode
  focusMode: boolean;
  focusLevel: FocusLevel;
  setFocusLevel: (level: FocusLevel) => void;
  toggleFocusMode: () => void;

  // Cross-component filters
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedDomain: DomainArea | null;
  setSelectedDomain: (domain: DomainArea | null) => void;

  // Global UI Modals / Drawers
  isQuickNotesOpen: boolean;
  setIsQuickNotesOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isLiveVoiceOpen: boolean;
  setIsLiveVoiceOpen: (open: boolean) => void;
  isAiSettingsOpen: boolean;
  setIsAiSettingsOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', name: 'To Do', color: '#6366f1', order: 0 },
  { id: 'in-progress', name: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'following', name: 'Following', color: '#8b5cf6', order: 2 },
  { id: 'done', name: 'Done', color: '#10b981', order: 3 },
];

const DEFAULT_CLOCKS: Clock[] = [
  { id: 'california', city: 'California', timezone: 'America/Los_Angeles', emoji: '🇺🇸', order: 0 },
  { id: 'new-york', city: 'New York', timezone: 'America/New_York', emoji: '🇺🇸', order: 1 },
  { id: 'berlin', city: 'Berlin', timezone: 'Europe/Berlin', emoji: '🇩🇪', order: 2 },
  { id: 'istanbul', city: 'Istanbul', timezone: 'Europe/Istanbul', emoji: '🇹🇷', order: 3 },
  { id: 'mumbai', city: 'Mumbai', timezone: 'Asia/Kolkata', emoji: '🇮🇳', order: 4 },
  { id: 'beijing', city: 'Beijing', timezone: 'Asia/Shanghai', emoji: '🇨🇳', order: 5 },
  { id: 'tokyo', city: 'Tokyo', timezone: 'Asia/Tokyo', emoji: '🇯🇵', order: 6 },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>([]);
  const [viewPreferences, setViewPreferences] = useState<ViewPreferences>({
    taskView: 'list',
    linkView: 'grid',
    showCompleted: true,
    groupBy: 'none',
    density: 'comfortable',
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [theme, setEffectiveTheme] = useState<Theme>('dark');
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('off');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainArea | null>(null);

  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsQuickNotesOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setIsLoading(true);
        const [
          fetchedTodos,
          fetchedProjects,
          fetchedSections,
          fetchedRecurring,
          fetchedColumns,
          fetchedClocks,
          fetchedTimes,
          fetchedNotes,
          fetchedLinks,
          fetchedPrefs,
        ] = await Promise.all([
          todoActions.getTodos().catch(() => []),
          projectActions.getProjects().catch(() => []),
          sectionActions.getSections().catch(() => []),
          recurringActions.getRecurringTasks().catch(() => []),
          kanbanActions.getKanbanColumns().catch(() => []),
          clockActions.getClocks().catch(() => []),
          timeActions.getTimeEntries().catch(() => []),
          noteActions.getNotes().catch(() => []),
          linkActions.getLinkGroups().catch(() => []),
          settingsActions.getViewPreferences().catch(() => null),
        ]);

        setTodos(fetchedTodos as unknown as Todo[]);
        setProjects(fetchedProjects as unknown as Project[]);
        setSections(fetchedSections as unknown as Section[]);
        setRecurringTasks(fetchedRecurring as unknown as RecurringTask[]);
        setKanbanColumns(fetchedColumns?.length ? fetchedColumns : DEFAULT_KANBAN_COLUMNS);
        setClocks(fetchedClocks?.length ? (fetchedClocks as Clock[]) : DEFAULT_CLOCKS);
        setTimeEntries(fetchedTimes as unknown as TimeEntry[]);
        setNotes(fetchedNotes as unknown as Note[]);
        setLinkGroups(fetchedLinks as unknown as LinkGroup[]);

        if (fetchedPrefs) {
          setViewPreferences((prev) => ({
            ...prev,
            taskView: (fetchedPrefs.taskView as any) || 'list',
            linkView: (fetchedPrefs.linkView as any) || 'grid',
            showCompleted: fetchedPrefs.showCompleted ?? true,
            groupBy: (fetchedPrefs.groupBy as any) || 'none',
          }));
        }

        const savedThemeMode = localStorage.getItem('productivity-theme-mode') as ThemeMode;
        const savedTheme = localStorage.getItem('productivity-theme') as Theme;
        if (savedThemeMode && ['system', 'light', 'dark'].includes(savedThemeMode)) {
          setThemeModeState(savedThemeMode);
        } else if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
          setThemeModeState(savedTheme);
        }

        const savedLevel = localStorage.getItem('productivity-focus-level') as FocusLevel;
        if (savedLevel && ['off', 'semi', 'deep'].includes(savedLevel)) {
          setFocusLevel(savedLevel);
        } else {
          const savedFocus = localStorage.getItem('productivity-focus-mode');
          if (savedFocus) setFocusLevel(JSON.parse(savedFocus) ? 'deep' : 'off');
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, []);

  // Todos CRUD
  const addTodo = async (data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = crypto.randomUUID();
    const newTodo: Todo = {
      ...data,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTodos((prev) => [...prev, newTodo]);

    try {
      const payload = {
        ...data,
        description: data.description || null,
        projectId: data.projectId || null,
        sectionId: data.sectionId || null,
        parentTodoId: data.parentTodoId || null,
        dueDate: data.dueDate ?? null,
        deadline: data.deadline ?? null,
        recurringTaskId: data.recurringTaskId || null,
        targetCount: data.targetCount ?? null,
        currentCount: data.currentCount ?? null,
        unit: data.unit || null,
        estimateHours: data.estimateHours ?? null,
      };
      const created = await todoActions.createTodo(payload);
      setTodos((prev) => prev.map((t) => (t.id === tempId ? (created as unknown as Todo) : t)));
    } catch (e) {
      console.error(e);
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await todoActions.updateTodo(id, updates);
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parentTodoId !== id));
    await todoActions.deleteTodo(id);
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    await todoActions.toggleTodo(id);
  };

  // Projects CRUD
  const addProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const tempId = crypto.randomUUID();
    const newProj = { ...project, id: tempId, createdAt: new Date() };
    setProjects((prev) => [...prev, newProj]);
    try {
      const created = await projectActions.createProject({
        ...project,
        icon: project.icon ?? null,
      });
      setProjects((prev) => prev.map((p) => (p.id === tempId ? (created as unknown as Project) : p)));
    } catch (e) {
      console.error(e);
      setProjects((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    await projectActions.updateProject(id, updates);
  };

  const deleteProject = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
    await projectActions.deleteProject(id);
  };

  // Sections CRUD
  const addSection = async (section: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = crypto.randomUUID();
    const newSection: Section = { ...section, id: tempId, createdAt: new Date(), updatedAt: new Date() };
    setSections((prev) => [...prev, newSection]);
    try {
      const payload = {
        ...section,
        color: section.color ?? null,
        icon: section.icon ?? null,
        parentId: section.parentId ?? null,
      };
      const created = await sectionActions.createSection(payload);
      setSections((prev) => prev.map((s) => (s.id === tempId ? (created as unknown as Section) : s)));
    } catch (e) {
      console.error(e);
      setSections((prev) => prev.filter((s) => s.id !== tempId));
    }
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await sectionActions.updateSection(id, updates);
  };

  const deleteSection = async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await sectionActions.deleteSection(id);
  };

  // Recurring Tasks CRUD
  const addRecurringTask = async (
    task: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'lastRunDate'>
  ) => {
    const tempId = crypto.randomUUID();
    const newTask: RecurringTask = {
      ...task,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setRecurringTasks((prev) => [...prev, newTask]);
    try {
      const payload = {
        ...task,
        tags: task.tags ?? [],
        description: task.description ?? null,
        projectId: task.projectId ?? null,
        dayOfMonth: task.dayOfMonth ?? null,
        endDate: task.endDate ?? null,
      };
      const created = await recurringActions.createRecurringTask(payload);
      setRecurringTasks((prev) =>
        prev.map((t) => (t.id === tempId ? (created as unknown as RecurringTask) : t))
      );
    } catch (e) {
      console.error(e);
      setRecurringTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const updateRecurringTask = async (id: string, updates: Partial<RecurringTask>) => {
    setRecurringTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await recurringActions.updateRecurringTask(id, updates);
  };

  const deleteRecurringTask = async (id: string) => {
    setRecurringTasks((prev) => prev.filter((t) => t.id !== id));
    await recurringActions.deleteRecurringTask(id);
  };

  // Clocks
  const addClock = async (clock: Omit<Clock, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newClock = { ...clock, id: tempId };
    setClocks((prev) => [...prev, newClock]);
    try {
      const created = await clockActions.createClock(clock);
      setClocks((prev) => prev.map((c) => (c.id === tempId ? created : c)));
    } catch (e) {
      console.error(e);
      setClocks((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const updateClock = async (id: string, updates: Partial<Clock>) => {
    setClocks((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await clockActions.updateClock(id, updates);
  };

  const deleteClock = async (id: string) => {
    setClocks((prev) => prev.filter((c) => c.id !== id));
    await clockActions.deleteClock(id);
  };

  const reorderClocks = async (newClocks: Clock[]) => {
    setClocks(newClocks);
    await clockActions.reorderClocks(newClocks);
  };

  // Time Tracking
  const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newEntry: TimeEntry = { ...entry, id: tempId };
    setTimeEntries((prev) => [newEntry, ...prev]);
    try {
      const payload = {
        ...entry,
        taskId: entry.taskId ?? null,
        description: entry.description ?? null,
      };
      const created = await timeActions.createTimeEntry(payload);
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === tempId ? (created as unknown as TimeEntry) : e))
      );
    } catch (e) {
      console.error(e);
      setTimeEntries((prev) => prev.filter((e) => e.id !== tempId));
    }
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    await timeActions.updateTimeEntry(id, updates);
  };

  const deleteTimeEntry = async (id: string) => {
    setTimeEntries((prev) => prev.filter((e) => e.id !== id));
    await timeActions.deleteTimeEntry(id);
  };

  // Kanban Columns
  const addKanbanColumn = async (column: Omit<KanbanColumn, 'id'>) => {
    const tempId = crypto.randomUUID();
    setKanbanColumns((prev) => [...prev, { ...column, id: tempId }]);
    try {
      const created = await kanbanActions.createKanbanColumn(column);
      setKanbanColumns((prev) => prev.map((c) => (c.id === tempId ? created : c)));
    } catch (e) {
      console.error(e);
      setKanbanColumns((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const updateKanbanColumn = async (id: string, updates: Partial<KanbanColumn>) => {
    setKanbanColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await kanbanActions.updateKanbanColumn(id, updates);
  };

  const deleteKanbanColumn = async (id: string) => {
    const fallback = kanbanColumns.find((c) => c.id !== id)?.id || 'todo';
    setKanbanColumns((prev) => prev.filter((c) => c.id !== id));
    await kanbanActions.deleteKanbanColumn(id, fallback);
  };

  // Notes
  const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = crypto.randomUUID();
    const newNote: Note = {
      ...note,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
    const payload = {
      ...note,
      color: note.color ?? null,
    };
    noteActions
      .createNote(payload)
      .then((created) => {
        setNotes((prev) => prev.map((n) => (n.id === tempId ? (created as unknown as Note) : n)));
      })
      .catch((e) => {
        console.error(e);
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
      });
    return tempId;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    await noteActions.updateNote(id, updates);
  };

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await noteActions.deleteNote(id);
  };

  // Link Groups
  const addLinkGroup = async (group: Omit<LinkGroup, 'id' | 'links'>) => {
    const tempId = crypto.randomUUID();
    const newGroup = { ...group, id: tempId, links: [] };
    setLinkGroups((prev) => [...prev, newGroup]);
    try {
      const created = await linkActions.createLinkGroup({
        ...group,
        icon: group.icon ?? null,
      });
      setLinkGroups((prev) =>
        prev.map((g) => (g.id === tempId ? { ...(created as unknown as LinkGroup), links: [] } : g))
      );
    } catch (e) {
      console.error(e);
      setLinkGroups((prev) => prev.filter((g) => g.id !== tempId));
    }
  };

  const updateLinkGroup = async (id: string, updates: Partial<LinkGroup>) => {
    setLinkGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    await linkActions.updateLinkGroup(id, updates);
  };

  const deleteLinkGroup = async (id: string) => {
    setLinkGroups((prev) => prev.filter((g) => g.id !== id));
    await linkActions.deleteLinkGroup(id);
  };

  const addLink = async (link: Omit<QuickLink, 'id'>) => {
    const tempId = 'temp-' + Date.now();
    setLinkGroups((prev) =>
      prev.map((g) => {
        if (g.id === link.groupId) {
          return { ...g, links: [...g.links, { ...link, id: tempId }] };
        }
        return g;
      })
    );
    await linkActions.createLink({ ...link, icon: link.icon ?? null });
    const groups = await linkActions.getLinkGroups();
    setLinkGroups(groups as unknown as LinkGroup[]);
  };

  const updateLink = async (id: string, updates: Partial<QuickLink>) => {
    setLinkGroups((prev) =>
      prev.map((g) => ({
        ...g,
        links: g.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }))
    );
    await linkActions.updateLink(id, updates);
  };

  const deleteLink = async (id: string) => {
    setLinkGroups((prev) =>
      prev.map((g) => ({ ...g, links: g.links.filter((l) => l.id !== id) }))
    );
    await linkActions.deleteLink(id);
  };

  const reorderLinks = async (groupId: string, links: QuickLink[]) => {
    const reordered = links.map((link, index) => ({ ...link, order: index }));
    setLinkGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, links: reordered } : g))
    );
    await linkActions.reorderLinks(reordered);
  };

  // Preferences / Theme
  const updateViewPreferences = async (updates: Partial<ViewPreferences>) => {
    setViewPreferences((prev) => ({ ...prev, ...updates }));
    await settingsActions.updateViewPreferences(updates);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('productivity-theme-mode', mode);
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode =
      themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
    setThemeMode(nextMode);
  };

  const toggleFocusMode = () => {
    setFocusLevel((prev) => {
      const next: FocusLevel = prev === 'off' ? 'semi' : prev === 'semi' ? 'deep' : 'off';
      localStorage.setItem('productivity-focus-level', next);
      localStorage.setItem('productivity-focus-mode', JSON.stringify(next === 'deep'));
      return next;
    });
  };

  const focusMode = focusLevel === 'deep';

  useEffect(() => {
    const savedLevel = localStorage.getItem('productivity-focus-level') as FocusLevel;
    if (savedLevel && ['off', 'semi', 'deep'].includes(savedLevel)) {
      setFocusLevel(savedLevel);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveTheme = (mode: ThemeMode): Theme => {
      if (mode === 'system') {
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return mode;
    };

    const currentTheme = resolveTheme(themeMode);
    setEffectiveTheme(currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        const sysTheme: Theme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(sysTheme);
        document.documentElement.setAttribute('data-theme', sysTheme);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [themeMode]);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        todos,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleTodo,
        projects,
        addProject,
        updateProject,
        deleteProject,
        sections,
        addSection,
        updateSection,
        deleteSection,
        recurringTasks,
        addRecurringTask,
        updateRecurringTask,
        deleteRecurringTask,
        clocks,
        addClock,
        updateClock,
        deleteClock,
        reorderClocks,
        timeEntries,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        kanbanColumns,
        addKanbanColumn,
        updateKanbanColumn,
        deleteKanbanColumn,
        linkGroups,
        addLinkGroup,
        updateLinkGroup,
        deleteLinkGroup,
        addLink,
        updateLink,
        deleteLink,
        reorderLinks,
        viewPreferences,
        updateViewPreferences,
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
        notes,
        addNote,
        updateNote,
        deleteNote,
        focusMode,
        focusLevel,
        setFocusLevel,
        toggleFocusMode,
        selectedProjectId,
        setSelectedProjectId,
        selectedDomain,
        setSelectedDomain,
        isQuickNotesOpen,
        setIsQuickNotesOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isLiveVoiceOpen,
        setIsLiveVoiceOpen,
        isAiSettingsOpen,
        setIsAiSettingsOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
      }}
    >
      <FocusProvider>{children}</FocusProvider>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
