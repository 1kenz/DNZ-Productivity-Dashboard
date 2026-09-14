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

export async function createRecurringTask(
  data: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'lastRunDate'>
) {
  const task = await prisma.recurringTask.create({ data });
  revalidatePath('/');
  return task;
}

export async function updateRecurringTask(id: string, updates: Partial<RecurringTask>) {
  const task = await prisma.recurringTask.update({
    where: { id },
    data: updates,
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
