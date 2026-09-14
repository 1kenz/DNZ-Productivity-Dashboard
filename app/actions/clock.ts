'use server';

import { prisma } from '@/lib/prisma';
import { Clock } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getClocks() {
  return await prisma.clock.findMany({
    orderBy: { order: 'asc' },
  });
}

export async function createClock(data: Omit<Clock, 'id'>) {
  const clock = await prisma.clock.create({
    data,
  });
  revalidatePath('/');
  return clock;
}

export async function updateClock(id: string, updates: Partial<Clock>) {
  const clock = await prisma.clock.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return clock;
}

export async function deleteClock(id: string) {
  await prisma.clock.delete({
    where: { id },
  });
  revalidatePath('/');
}

export async function reorderClocks(clocks: Clock[]) {
  const transaction = clocks.map((clock, index) => 
    prisma.clock.update({
      where: { id: clock.id },
      data: { order: index }
    })
  );
  await prisma.$transaction(transaction);
  revalidatePath('/');
}
