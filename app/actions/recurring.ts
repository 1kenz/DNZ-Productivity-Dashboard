'use server';

import { prisma } from '@/lib/prisma';
import { RecurringTask } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getOccurrencesBetween, RecurrenceRule } from '@/lib/recurrence';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getRecurringTasks() {
  return await prisma.recurringTask.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createRecurringTask(data: any) {
  const payload = {
    title: data.title,
    description: data.description ?? null,
    priority: data.priority || 'medium',
    projectId: data.projectId ?? null,
    tags: Array.isArray(data.tags) ? data.tags : data.domain ? [data.domain] : [],
    frequency: data.frequency || 'weekly',
    interval: Number(data.interval) || 1,
    daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [],
    dayOfMonth: data.dayOfMonth != null ? Number(data.dayOfMonth) : null,
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : null,
    active: data.active ?? true,
  };
  const task = await prisma.recurringTask.create({ data: payload });
  revalidatePath('/');
  return task;
}

export async function updateRecurringTask(id: string, updates: any) {
  const data: any = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description ?? null;
  if (updates.priority !== undefined) data.priority = updates.priority;
  if (updates.projectId !== undefined) data.projectId = updates.projectId ?? null;
  if (updates.tags !== undefined) data.tags = Array.isArray(updates.tags) ? updates.tags : [];
  else if (updates.domain !== undefined) data.tags = [updates.domain];
  if (updates.frequency !== undefined) data.frequency = updates.frequency;
  if (updates.interval !== undefined) data.interval = Number(updates.interval) || 1;
  if (updates.daysOfWeek !== undefined) data.daysOfWeek = Array.isArray(updates.daysOfWeek) ? updates.daysOfWeek : [];
  if (updates.dayOfMonth !== undefined) data.dayOfMonth = updates.dayOfMonth != null ? Number(updates.dayOfMonth) : null;
  if (updates.startDate !== undefined) data.startDate = new Date(updates.startDate);
  if (updates.endDate !== undefined) data.endDate = updates.endDate ? new Date(updates.endDate) : null;
  if (updates.active !== undefined) data.active = Boolean(updates.active);
  if (updates.lastRunDate !== undefined) data.lastRunDate = updates.lastRunDate ? new Date(updates.lastRunDate) : null;

  const task = await prisma.recurringTask.update({
    where: { id },
    data,
  });
  revalidatePath('/');
  return task;
}

export async function deleteRecurringTask(id: string) {
  // Keep history: detach already-generated todos instead of deleting them.
  await prisma.todo.updateMany({
    where: { recurringTaskId: id },
    data: { recurringTaskId: null },
  });
  await prisma.recurringTask.delete({ where: { id } });
  revalidatePath('/');
}

/**
 * Catch-up generator: for every active recurring task, creates any Todo
 * occurrences due between its last run (or start date) and today. Safe to
 * call on every dashboard load — idempotent per (recurringTaskId, dueDate).
 */
export async function generateDueRecurringTodos() {
  const tasks = await prisma.recurringTask.findMany({ where: { active: true } });
  if (tasks.length === 0) return { created: 0 };

  const today = new Date();
  let created = 0;

  for (const task of tasks) {
    const rule: RecurrenceRule = {
      frequency: task.frequency as RecurrenceRule['frequency'],
      interval: task.interval,
      daysOfWeek: task.daysOfWeek,
      dayOfMonth: task.dayOfMonth,
      startDate: task.startDate,
      endDate: task.endDate,
    };

    // On the very first run, include the start date itself as a candidate.
    const from = task.lastRunDate ?? new Date(task.startDate.getTime() - DAY_MS);
    const occurrences = getOccurrencesBetween(rule, from, today);
    if (occurrences.length === 0) continue;

    for (const dueDate of occurrences) {
      try {
        // The @@unique([recurringTaskId, dueDate]) constraint is the real guard
        // against duplicates (e.g. concurrent generation calls); this just
        // avoids a wasted round-trip in the common case.
        const exists = await prisma.todo.findFirst({
          where: { recurringTaskId: task.id, dueDate },
          select: { id: true },
        });
        if (exists) continue;

        await prisma.todo.create({
          data: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            projectId: task.projectId,
            tags: task.tags,
            dueDate,
            status: 'todo',
            recurringTaskId: task.id,
          },
        });
        created += 1;
      } catch (err: any) {
        // P2002 = unique constraint violation -> another call already created this occurrence.
        if (err?.code !== 'P2002') throw err;
      }
    }

    await prisma.recurringTask.update({
      where: { id: task.id },
      data: { lastRunDate: today },
    });
  }

  if (created > 0) revalidatePath('/');
  return { created };
}
