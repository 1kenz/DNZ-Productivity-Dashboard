'use server';

import { prisma } from '@/lib/prisma';
import { Project } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt'>) {
  const project = await prisma.project.create({
    data,
  });
  revalidatePath('/');
  return project;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const project = await prisma.project.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return project;
}

export async function deleteProject(id: string) {
  // Prisma should handle cascade if configured, but let's be safe or let simple delete handle it
  // Our schema doesn't have cascade on Todos->Project (optional relation), so we might need to update todos first if we want to keep them.
  // The AppContext logic was: setTodos(todos.map((todo) => (todo.projectId === id ? { ...todo, projectId: undefined } : todo)));
  
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
