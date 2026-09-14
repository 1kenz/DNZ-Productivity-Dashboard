'use server';

import { prisma } from '@/lib/prisma';
import { Todo } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getTodos() {
  return await prisma.todo.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTodo(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) {
  const todo = await prisma.todo.create({
    data,
  });
  revalidatePath('/');
  return todo;
}

export async function updateTodo(id: string, updates: Partial<Todo>) {
  const todo = await prisma.todo.update({
    where: { id },
    data: updates,
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
export async function updateTodos(todos: Partial<Todo> & { id: string }[]) {
  const transaction = todos.map((todo) => 
    prisma.todo.update({
      where: { id: todo.id },
      data: todo
    })
  );
  await prisma.$transaction(transaction);
  revalidatePath('/');
}
