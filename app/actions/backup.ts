'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { BACKUP_VERSION, BackupPayload } from '@/types';

/**
 * Reads the entire database and returns it as a single JSON-serializable
 * snapshot. The client turns this straight into a downloadable .json file —
 * no server-side file storage involved.
 */
export async function exportAllData(): Promise<BackupPayload> {
  try {
    const [
      projects,
      sections,
      recurringTasks,
      todos,
      linkGroups,
      quickLinks,
      kanbanColumns,
      clocks,
      notes,
      timeEntries,
      viewPreferences,
    ] = await Promise.all([
      prisma.project.findMany(),
      prisma.section.findMany(),
      prisma.recurringTask.findMany(),
      prisma.todo.findMany(),
      prisma.linkGroup.findMany(),
      prisma.quickLink.findMany(),
      prisma.kanbanColumn.findMany(),
      prisma.clock.findMany(),
      prisma.note.findMany(),
      prisma.timeEntry.findMany(),
      prisma.viewPreferences.findMany(),
    ]);

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        projects,
        sections,
        recurringTasks,
        todos,
        linkGroups,
        quickLinks,
        kanbanColumns,
        clocks,
        notes,
        timeEntries,
        viewPreferences,
      },
    };
  } catch (err) {
    // Server Action errors get sanitized in production builds, so log the
    // real cause server-side (visible in the desktop app's log file, or
    // `docker compose logs` for the web deployment) AND surface a clear
    // message to the client instead of a generic one.
    console.error('[backup] exportAllData failed:', err);
    throw new Error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function toDate(v: unknown): Date | undefined {
  return v ? new Date(v as string) : undefined;
}

/**
 * Restores a backup produced by exportAllData(). This REPLACES all current
 * data — everything not in the backup is gone. IDs are preserved so
 * relations (todo -> project, quickLink -> linkGroup, etc.) stay intact.
 */
export async function restoreBackup(backup: BackupPayload) {
  try {
    return await restoreBackupInternal(backup);
  } catch (err) {
    console.error('[backup] restoreBackup failed:', err);
    throw new Error(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function restoreBackupInternal(backup: BackupPayload) {
  if (!backup?.data) {
    throw new Error('Invalid backup file');
  }
  const d = backup.data;

  const projects = (d.projects || []).map((p) => ({ ...p, createdAt: toDate(p.createdAt) }));
  const sections = (d.sections || []).map((s: any) => ({
    ...s,
    createdAt: toDate(s.createdAt),
    updatedAt: toDate(s.updatedAt),
  }));
  const recurringTasks = (d.recurringTasks || []).map((t) => ({
    ...t,
    startDate: toDate(t.startDate),
    endDate: toDate(t.endDate),
    lastRunDate: toDate(t.lastRunDate),
    createdAt: toDate(t.createdAt),
    updatedAt: toDate(t.updatedAt),
  }));
  const todos = (d.todos || []).map((t) => ({
    ...t,
    dueDate: toDate(t.dueDate),
    deadline: toDate(t.deadline),
    createdAt: toDate(t.createdAt),
    updatedAt: toDate(t.updatedAt),
  }));
  const notes = (d.notes || []).map((n) => ({
    ...n,
    createdAt: toDate(n.createdAt),
    updatedAt: toDate(n.updatedAt),
  }));
  const timeEntries = (d.timeEntries || []).map((e) => ({ ...e, createdAt: toDate(e.createdAt) }));
  const linkGroups = d.linkGroups || [];
  const quickLinks = d.quickLinks || [];
  const kanbanColumns = d.kanbanColumns || [];
  const clocks = d.clocks || [];
  const viewPreferences = d.viewPreferences || [];

  await prisma.$transaction(async (tx) => {
    // Children before parents. Todo self-references (parentTodoId) and
    // references Section, so it must go before Section, which in turn must
    // go before Project.
    await tx.todo.deleteMany();
    await tx.section.deleteMany();
    await tx.quickLink.deleteMany();
    await tx.linkGroup.deleteMany();
    await tx.recurringTask.deleteMany();
    await tx.project.deleteMany();
    await tx.kanbanColumn.deleteMany();
    await tx.clock.deleteMany();
    await tx.note.deleteMany();
    await tx.timeEntry.deleteMany();
    await tx.viewPreferences.deleteMany();

    // Parents before children. Project before Section before Todo (Todo can
    // reference both a Section and, via parentTodoId, another Todo -- since
    // createMany doesn't guarantee row order for a self-reference, subtasks
    // are inserted in a second pass below once their parent rows exist).
    if (projects.length) await tx.project.createMany({ data: projects });
    if (sections.length) await tx.section.createMany({ data: sections });
    if (recurringTasks.length) await tx.recurringTask.createMany({ data: recurringTasks });
    const topLevelTodos = todos.filter((t: any) => !t.parentTodoId);
    const subTodos = todos.filter((t: any) => t.parentTodoId);
    if (topLevelTodos.length) await tx.todo.createMany({ data: topLevelTodos });
    if (subTodos.length) await tx.todo.createMany({ data: subTodos });
    if (linkGroups.length) await tx.linkGroup.createMany({ data: linkGroups });
    if (quickLinks.length) await tx.quickLink.createMany({ data: quickLinks });
    if (kanbanColumns.length) await tx.kanbanColumn.createMany({ data: kanbanColumns });
    if (clocks.length) await tx.clock.createMany({ data: clocks });
    if (notes.length) await tx.note.createMany({ data: notes });
    if (timeEntries.length) await tx.timeEntry.createMany({ data: timeEntries });
    if (viewPreferences.length) await tx.viewPreferences.createMany({ data: viewPreferences });
  });

  revalidatePath('/');
}
