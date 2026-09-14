/**
 * @jest-environment node
 */
import { createTodo, getTodos, deleteTodo } from '@/app/actions/todo';
import { prisma } from '@/lib/prisma';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Use node environment since we are testing server actions which use prisma directly or fetch
// Actually, server actions run on server. In Jest with next/jest, we can often test logic.
// However, Prisma Client requires a running DB.

describe('Persistence Integration Test', () => {
    let testTodoId: string | null = null;
    
    afterAll(async () => {
        if (testTodoId) {
            try {
                await deleteTodo(testTodoId);
            } catch (e) {
                // ignore cleanup errors
            }
        }
        await prisma.$disconnect();
    });

    it('should create and persist a todo item', async () => {
        const todoData = {
            title: 'Integration Test Todo',
            description: 'Testing DB persistence',
            completed: false,
            priority: 'high' as const,
            status: 'todo',
            // optional fields need to be handled carefully in tests if types are strict
            projectId: null,
            tags: [],
            dueDate: null,
            deadline: null
        };

        try {
            const newTodo = await createTodo(todoData);
            expect(newTodo).toBeDefined();
            expect(newTodo.id).toBeDefined();
            testTodoId = newTodo.id;
            expect(newTodo.title).toBe(todoData.title);

            // Verify persistence by fetching
            const allTodos = await getTodos();
            const found = allTodos.find(t => t.id === newTodo.id);
            expect(found).toBeDefined();
            expect(found?.title).toBe(todoData.title);
        } catch (error) {
            console.error('Persistence Test Failed:', error);
            throw error;
        }
    });
});
