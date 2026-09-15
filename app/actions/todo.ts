'use server';

import { prisma } from '@/lib/prisma';
import { Todo } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getTodos() {
  return await prisma.todo.findMany({
    orderBy: { createdAt: 'asc' },
  });
}

export async function createTodo(data: any) {
  try {
    const tags = Array.isArray(data.tags) ? data.tags : data.domain ? [data.domain] : [];
    const payload = {
      title: (data.title && String(data.title).trim()) || 'Untitled Task',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      completed: Boolean(data.completed),
      tags,
      description: data.description && String(data.description).trim() ? String(data.description) : null,
      projectId: data.projectId && String(data.projectId).trim() ? String(data.projectId) : null,
      sectionId: data.sectionId && String(data.sectionId).trim() ? String(data.sectionId) : null,
      parentTodoId: data.parentTodoId && String(data.parentTodoId).trim() ? String(data.parentTodoId) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      recurringTaskId: data.recurringTaskId && String(data.recurringTaskId).trim() ? String(data.recurringTaskId) : null,
      targetCount: data.targetCount != null && data.targetCount !== '' ? Number(data.targetCount) : null,
      currentCount: data.currentCount != null && data.currentCount !== '' ? Number(data.currentCount) : null,
      unit: data.unit && String(data.unit).trim() ? String(data.unit) : null,
      estimateHours: data.estimateHours != null && data.estimateHours !== '' ? Number(data.estimateHours) : null,
    };

    const todo = await prisma.todo.create({
      data: payload,
    });
    revalidatePath('/');
    return todo;
  } catch (err) {
    console.error('[todo.ts] createTodo error:', err);
    throw err;
  }
}

export async function updateTodo(id: string, updates: any) {
  const data: any = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) {
    data.description = updates.description && String(updates.description).trim() ? String(updates.description) : null;
  }
  if (updates.completed !== undefined) data.completed = Boolean(updates.completed);
  if (updates.priority !== undefined) data.priority = updates.priority;
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.tags !== undefined) {
    data.tags = Array.isArray(updates.tags) ? updates.tags : [];
  } else if (updates.domain !== undefined) {
    data.tags = updates.domain ? [updates.domain] : [];
  }
  if (updates.projectId !== undefined) {
    data.projectId = updates.projectId && String(updates.projectId).trim() ? String(updates.projectId) : null;
  }
  if (updates.sectionId !== undefined) {
    data.sectionId = updates.sectionId && String(updates.sectionId).trim() ? String(updates.sectionId) : null;
  }
  if (updates.parentTodoId !== undefined) {
    data.parentTodoId = updates.parentTodoId && String(updates.parentTodoId).trim() ? String(updates.parentTodoId) : null;
  }
  if (updates.recurringTaskId !== undefined) {
    data.recurringTaskId = updates.recurringTaskId && String(updates.recurringTaskId).trim() ? String(updates.recurringTaskId) : null;
  }
  if (updates.dueDate !== undefined) {
    data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
  }
  if (updates.deadline !== undefined) {
    data.deadline = updates.deadline ? new Date(updates.deadline) : null;
  }
  if (updates.targetCount !== undefined) {
    data.targetCount = updates.targetCount != null && updates.targetCount !== '' ? Number(updates.targetCount) : null;
  }
  if (updates.currentCount !== undefined) {
    data.currentCount = updates.currentCount != null && updates.currentCount !== '' ? Number(updates.currentCount) : null;
  }
  if (updates.unit !== undefined) {
    data.unit = updates.unit && String(updates.unit).trim() ? String(updates.unit) : null;
  }
  if (updates.estimateHours !== undefined) {
    data.estimateHours = updates.estimateHours != null && updates.estimateHours !== '' ? Number(updates.estimateHours) : null;
  }

  const todo = await prisma.todo.update({
    where: { id },
    data,
  });
  revalidatePath('/');
  return todo;
}

export async function toggleTodo(id: string) {
  const existing = await prisma.todo.findUnique({ where: { id } });
  if (!existing) return null;
  const todo = await prisma.todo.update({
    where: { id },
    data: { completed: !existing.completed },
  });
  revalidatePath('/');
  return todo;
}

export async function deleteTodo(id: string) {
  await prisma.todo.delete({
    where: { id },
  });
  revalidatePath('/');
}

// Batch update for migrations or mass edits
export async function updateTodos(todos: (Partial<Todo> & { id: string })[]) {
  const transaction = todos.map((todo) =>
    prisma.todo.update({
      where: { id: todo.id },
      data: todo,
    })
  );
  await prisma.$transaction(transaction);
  revalidatePath('/');
}
