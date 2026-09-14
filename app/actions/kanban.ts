'use server';

import { prisma } from '@/lib/prisma';
import { KanbanColumn } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getKanbanColumns() {
  return await prisma.kanbanColumn.findMany({
    orderBy: { order: 'asc' },
  });
}

export async function createKanbanColumn(data: Omit<KanbanColumn, 'id'>) {
  const column = await prisma.kanbanColumn.create({
    data,
  });
  revalidatePath('/');
  return column;
}

export async function updateKanbanColumn(id: string, updates: Partial<KanbanColumn>) {
  const column = await prisma.kanbanColumn.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return column;
}

export async function deleteKanbanColumn(id: string, fallbackColumnId: string) {
  // Move tasks to fallback column
  await prisma.todo.updateMany({
    where: { status: id },
    data: { status: fallbackColumnId },
  });

  await prisma.kanbanColumn.delete({
    where: { id },
  });
  revalidatePath('/');
}
