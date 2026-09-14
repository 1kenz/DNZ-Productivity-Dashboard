'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Todo, LinkGroup, Project, RecurringTask, KanbanColumn, ViewPreferences, Clock, TimeEntry, Note, QuickLink } from '@/types';
import * as todoActions from '@/app/actions/todo';
import * as projectActions from '@/app/actions/project';
import * as recurringActions from '@/app/actions/recurring';
import * as kanbanActions from '@/app/actions/kanban';
import * as clockActions from '@/app/actions/clock';
import * as linkActions from '@/app/actions/link';
import * as noteActions from '@/app/actions/note';
import * as timeActions from '@/app/actions/time';
import * as settingsActions from '@/app/actions/settings';

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
  addLinkGroup: (group: Omit<LinkGroup, 'id' | 'links'>) => void; // Fixed type signature to match reality: we add group without links
  updateLinkGroup: (id: string, updates: Partial<LinkGroup>) => void;
  deleteLinkGroup: (id: string) => void;
  // Link operations need to be exposed or handled via groups usually, 
  // but existing AppContext might have handled links via updateLinkGroup? 
  // Checking original: existing AppContext exposed linkGroups and updateLinkGroup. 
  // Adding specific link actions if needed by components.
  addLink: (link: Omit<QuickLink, 'id'>) => void;
  deleteLink: (id: string) => void;

  // Notes
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // View Preferences
  viewPreferences: ViewPreferences;
  updateViewPreferences: (updates: Partial<ViewPreferences>) => void;

  // Focus Mode
  focusMode: boolean;
  toggleFocusMode: () => void;

  // Cross-component "jump to this project's tasks" filter
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default Kanban columns
const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', name: 'To Do', color: '#6366f1', order: 0 },
  { id: 'in-progress', name: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'following', name: 'Following', color: '#8b5cf6', order: 2 },
  { id: 'done', name: 'Done', color: '#10b981', order: 3 },
];

// Default Clocks (West to East: NY -> Berlin -> Istanbul -> Mumbai)
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
  });
  
  // Theme and Focus Mode can remain local storage driven for pure UI preference availability immediately?
  // Or migrate them too. The plan said ViewPreferences migrated. Theme usually local.
  // Using simple local storage for theme/focus to avoid flickering before DB load, or just standard useState initialized from localstorage if strictly needed.
  // For now, let's keep Theme/Focus in local state/localstorage manually or just state.
  // Original implementation had useLocalStorage for theme.
  // I'll implement a simple usage of localStorage for theme directly here to keep it fast.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Generate any recurring-task occurrences due up to today BEFORE loading
        // todos, so a task that repeats "every Monday" etc. is already there
        // the next time the dashboard is opened.
        await recurringActions.generateDueRecurringTodos();

        const [
          loadedTodos,
          loadedProjects,
          loadedRecurringTasks,
          loadedKanban,
          loadedClocks,
          loadedTimeEntries,
          loadedNotes,
          loadedLinkGroups,
          loadedPrefs
        ] = await Promise.all([
          todoActions.getTodos(),
          projectActions.getProjects(),
          recurringActions.getRecurringTasks(),
          kanbanActions.getKanbanColumns(),
          clockActions.getClocks(),
          timeActions.getTimeEntries(),
          noteActions.getNotes(),
          linkActions.getLinkGroups(),
          settingsActions.getViewPreferences()
        ]);

        // Cast prisma types to our types if necessary (Dates are objects coming from server actions usually)
        setTodos(loadedTodos as unknown as Todo[]);
        setProjects(loadedProjects as unknown as Project[]);
        setRecurringTasks(loadedRecurringTasks as unknown as RecurringTask[]);
        setKanbanColumns(loadedKanban.length > 0 ? loadedKanban : DEFAULT_KANBAN_COLUMNS);
        setClocks(loadedClocks.length > 0 ? loadedClocks : DEFAULT_CLOCKS);
        setTimeEntries(loadedTimeEntries as unknown as TimeEntry[]);
        setNotes(loadedNotes as unknown as Note[]);
        setLinkGroups(loadedLinkGroups as unknown as LinkGroup[]);
        setViewPreferences(loadedPrefs as unknown as ViewPreferences);

        // Client-side only prefs
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('productivity-theme') as 'light' | 'dark';
            if (storedTheme) setTheme(storedTheme);
            const storedFocus = localStorage.getItem('productivity-focus-mode');
            if (storedFocus) setFocusMode(JSON.parse(storedFocus));
        }

      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // -- Event Handlers (Wrapping Server Actions + Local State Optimistic Update/Refetch) --

  // Todo operations
  const addTodo = async (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Optimistic
    const tempId = crypto.randomUUID();
    const newTodo: Todo = { ...todo, id: tempId, createdAt: new Date(), updatedAt: new Date(), status: todo.status || kanbanColumns[0]?.id || 'todo', completed: false, priority: todo.priority || 'medium' };
    setTodos(prev => [newTodo, ...prev]);

    try {
        const payload = {
            ...todo,
            description: todo.description ?? null,
            projectId: todo.projectId ?? null,
            dueDate: todo.dueDate ?? null,
            deadline: todo.deadline ?? null,
            tags: todo.tags ?? [], // Ensure array
            recurringTaskId: todo.recurringTaskId ?? null,
        };
        const created = await todoActions.createTodo(payload);
        // Replace temp with actual
        setTodos(prev => prev.map(t => t.id === tempId ? (created as unknown as Todo) : t));
    } catch (e) {
        console.error(e);
        // Revert on error
        setTodos(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    // Optimistic
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t));
    try {
        await todoActions.updateTodo(id, updates);
    } catch (e) {
        console.error(e);
        // Could revert here by fetching fresh data
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistic
    const backup = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
        await todoActions.deleteTodo(id);
    } catch (e) {
        console.error(e);
        if (backup) setTodos(prev => [...prev, backup]);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    updateTodo(id, { completed: !todo.completed });
  };

  // Project operations
  const addProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const tempId = crypto.randomUUID();
    const newProject = { ...project, id: tempId, createdAt: new Date() };
    setProjects(prev => [newProject, ...prev]);
    try {
        const payload = {
            ...project,
            icon: project.icon ?? null,
        };
        const created = await projectActions.createProject(payload);
        setProjects(prev => prev.map(p => p.id === tempId ? (created as unknown as Project) : p));
    } catch (e) {
        console.error(e);
        setProjects(prev => prev.filter(p => p.id !== tempId));
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await projectActions.updateProject(id, updates);
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    // Also remove project from todos locally
    setTodos(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
    await projectActions.deleteProject(id);
  };

  // Recurring Task operations
  const addRecurringTask = async (
    task: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'lastRunDate'>
  ) => {
    const tempId = crypto.randomUUID();
    const newTask: RecurringTask = { ...task, id: tempId, createdAt: new Date(), updatedAt: new Date() };
    setRecurringTasks(prev => [newTask, ...prev]);
    try {
      const payload = {
        ...task,
        description: task.description ?? null,
        projectId: task.projectId ?? null,
        tags: task.tags ?? [],
        daysOfWeek: task.daysOfWeek ?? [],
        dayOfMonth: task.dayOfMonth ?? null,
        endDate: task.endDate ?? null,
      };
      const created = await recurringActions.createRecurringTask(payload);
      setRecurringTasks(prev => prev.map(t => t.id === tempId ? (created as unknown as RecurringTask) : t));
      // A newly created task may already be due today (e.g. its start date is today) —
      // run the generator once more and refresh todos so it shows up immediately.
      await recurringActions.generateDueRecurringTodos();
      const freshTodos = await todoActions.getTodos();
      setTodos(freshTodos as unknown as Todo[]);
    } catch (e) {
      console.error(e);
      setRecurringTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const updateRecurringTask = async (id: string, updates: Partial<RecurringTask>) => {
    setRecurringTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t));
    await recurringActions.updateRecurringTask(id, updates);
  };

  const deleteRecurringTask = async (id: string) => {
    setRecurringTasks(prev => prev.filter(t => t.id !== id));
    setTodos(prev => prev.map(t => t.recurringTaskId === id ? { ...t, recurringTaskId: undefined } : t));
    await recurringActions.deleteRecurringTask(id);
  };

  // Kanban operations
  const addKanbanColumn = async (column: Omit<KanbanColumn, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newCol = { ...column, id: tempId };
    setKanbanColumns(prev => [...prev, newCol]);
    try {
        const created = await kanbanActions.createKanbanColumn(column);
        setKanbanColumns(prev => prev.map(c => c.id === tempId ? created : c));
    } catch(e) { console.error(e); setKanbanColumns(prev => prev.filter(c => c.id !== tempId)); }
  };

  const updateKanbanColumn = async (id: string, updates: Partial<KanbanColumn>) => {
    setKanbanColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await kanbanActions.updateKanbanColumn(id, updates);
  };

  const deleteKanbanColumn = async (id: string) => {
    if (kanbanColumns.length <= 1) return;
    const remaining = kanbanColumns.filter(c => c.id !== id);
    const fallbackId = remaining[0].id;
    
    setKanbanColumns(remaining);
    setTodos(prev => prev.map(t => t.status === id ? { ...t, status: fallbackId } : t));
    
    await kanbanActions.deleteKanbanColumn(id, fallbackId);
  };

  // Clock operations
  const addClock = async (clock: Omit<Clock, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newClock = { ...clock, id: tempId };
    setClocks(prev => [...prev, newClock]);
    try {
        const created = await clockActions.createClock(clock);
        setClocks(prev => prev.map(c => c.id === tempId ? created : c));
    } catch(e) { console.error(e); setClocks(prev => prev.filter(c => c.id !== tempId)); }
  };

  const updateClock = async (id: string, updates: Partial<Clock>) => {
    setClocks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await clockActions.updateClock(id, updates);
  };

  const deleteClock = async (id: string) => {
    setClocks(prev => prev.filter(c => c.id !== id));
    await clockActions.deleteClock(id);
  };

  const reorderClocks = async (newClocks: Clock[]) => {
    setClocks(newClocks);
    await clockActions.reorderClocks(newClocks);
  };

  // Time entries
  const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newEntry = { ...entry, id: tempId, createdAt: new Date() };
    setTimeEntries(prev => [newEntry, ...prev]);
    try {
        const payload = {
             ...entry,
             taskId: entry.taskId ?? null,
             description: entry.description ?? null
        };
        const created = await timeActions.createTimeEntry(payload);
        setTimeEntries(prev => prev.map(e => e.id === tempId ? (created as unknown as TimeEntry) : e));
    } catch(e) { console.error(e); setTimeEntries(prev => prev.filter(e => e.id !== tempId)); }
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await timeActions.updateTimeEntry(id, updates);
  };

  const deleteTimeEntry = async (id: string) => {
    setTimeEntries(prev => prev.filter(e => e.id !== id));
    await timeActions.deleteTimeEntry(id);
  };

  // Notes
  const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = crypto.randomUUID();
    const newNote = { ...note, id: tempId, createdAt: new Date(), updatedAt: new Date() };
    setNotes(prev => [newNote, ...prev]);
    (async () => {
      try {
          const payload = { ...note, color: note.color ?? null };
          const created = await noteActions.createNote(payload);
          setNotes(prev => prev.map(n => n.id === tempId ? (created as unknown as Note) : n));
      } catch(e) { console.error(e); setNotes(prev => prev.filter(n => n.id !== tempId)); }
    })();
    return tempId;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
    await noteActions.updateNote(id, updates);
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await noteActions.deleteNote(id);
  };

  // Link Groups
  const addLinkGroup = async (group: Omit<LinkGroup, 'id' | 'links'>) => {
    const tempId = crypto.randomUUID();
    const newGroup = { ...group, id: tempId, links: [] };
    setLinkGroups(prev => [...prev, newGroup]);
    try {
        const payload = {
            ...group,
            icon: group.icon ?? null,
        };
        const created = await linkActions.createLinkGroup(payload);
        setLinkGroups(prev => prev.map(g => g.id === tempId ? { ...(created as unknown as LinkGroup), links: [] } : g));
    } catch(e) { console.error(e); setLinkGroups(prev => prev.filter(g => g.id !== tempId)); }
  };

  const updateLinkGroup = async (id: string, updates: Partial<LinkGroup>) => {
    setLinkGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    await linkActions.updateLinkGroup(id, updates);
  };

  const deleteLinkGroup = async (id: string) => {
    setLinkGroups(prev => prev.filter(g => g.id !== id));
    await linkActions.deleteLinkGroup(id);
  };

  const addLink = async (link: Omit<QuickLink, 'id'>) => {
      // Optimistic link add
      setLinkGroups(prev => prev.map(g => {
          if (g.id === link.groupId) {
              return { ...g, links: [...g.links, { ...link, id: 'temp-' + Date.now() }] };
          }
          return g;
      }));
      // Need re-fetch or careful handling because we need the real ID
      const payload = { ...link, icon: link.icon ?? null };
      await linkActions.createLink(payload);
      const groups = await linkActions.getLinkGroups();
      setLinkGroups(groups as unknown as LinkGroup[]);
  };

  const deleteLink = async (id: string) => {
      setLinkGroups(prev => prev.map(g => ({ ...g, links: g.links.filter(l => l.id !== id) })));
      await linkActions.deleteLink(id);
  };

  // Preferences / Theme
  const updateViewPreferences = async (updates: Partial<ViewPreferences>) => {
    setViewPreferences(prev => ({ ...prev, ...updates }));
    await settingsActions.updateViewPreferences(updates);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('productivity-theme', newTheme);
  };

  const toggleFocusMode = () => {
    const newFocus = !focusMode;
    setFocusMode(newFocus);
    localStorage.setItem('productivity-focus-mode', JSON.stringify(newFocus));
  };

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
        deleteLink,
        viewPreferences,
        updateViewPreferences,
        theme,
        toggleTheme,
        notes,
        addNote,
        updateNote,
        deleteNote,
        focusMode,
        toggleFocusMode,
        selectedProjectId,
        setSelectedProjectId,
      }}
    >
      {children}
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
