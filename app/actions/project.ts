'use server';

import { prisma } from '@/lib/prisma';
import { Project } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProject(data: any) {
  try {
    const project = await prisma.project.create({
      data: {
        name: (data.name && String(data.name).trim()) || 'Untitled Project',
        color: (data.color && String(data.color).trim()) || '#6366f1',
        icon: (data.icon && String(data.icon).trim()) || '📁',
      },
    });
    revalidatePath('/');
    return project;
  } catch (err) {
    console.error('[project.ts] createProject error:', err);
    throw err;
  }
}

export async function updateProject(id: string, updates: any) {
  try {
    const data: { name?: string; color?: string; icon?: string | null } = {};
    if (updates.name !== undefined) data.name = String(updates.name).trim();
    if (updates.color !== undefined) data.color = String(updates.color).trim();
    if (updates.icon !== undefined) data.icon = (updates.icon && String(updates.icon).trim()) || '📁';

    const project = await prisma.project.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return project;
  } catch (err) {
    console.error('[project.ts] updateProject error:', err);
    throw err;
  }
}

export async function deleteProject(id: string) {
  // Prisma should handle cascade if configured, but let's be safe or let simple delete handle it
  // Our schema doesn't have cascade on Todos->Project (optional relation), so we might need to update todos first if we want to keep them.
  // The AppContext logic was: setTodos(todos.map((todo) => (todo.projectId === id ? { ...todo, projectId: undefined } : todo)));

  // Sections DO cascade-delete with their project (schema-level onDelete:
  // Cascade), but their Todos should be orphaned first, not deleted with
  // them -- same "keep the work items" policy as the projectId clear below.
  const sections = await prisma.section.findMany({ where: { projectId: id }, select: { id: true } });
  if (sections.length > 0) {
    await prisma.todo.updateMany({
      where: { sectionId: { in: sections.map((s) => s.id) } },
      data: { sectionId: null },
    });
  }

  // Update todos to remove projectId
  await prisma.todo.updateMany({
    where: { projectId: id },
    data: { projectId: null },
  });

  await prisma.project.delete({
    where: { id },
  });
  revalidatePath('/');
}
