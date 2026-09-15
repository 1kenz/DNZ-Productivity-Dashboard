import { Todo } from '@/types';

export interface FlatTaskRow {
  todo: Todo;
  depth: number;
  hasChildren: boolean;
}

// Depth-first flatten of a task tree for the compact table list view. Only
// descends into a node's children when that node's id is in `expanded`, so
// a collapsed branch simply doesn't appear in the flat array -- this is
// what lets every row sit in the same CSS grid (so Due Date / Priority stay
// pixel-aligned across depths) while indentation is expressed purely as
// left padding inside the Name cell. Children are looked up from the full
// `allTodos` list by parentTodoId (not the group's own list), so a task's
// subtree renders the same regardless of which group its parent falls in.
export function flattenTaskTree(
  roots: Todo[],
  allTodos: Todo[],
  expanded: Set<string>,
  depth = 0
): FlatTaskRow[] {
  const rows: FlatTaskRow[] = [];
  for (const todo of roots) {
    const children = allTodos.filter((t) => t.parentTodoId === todo.id);
    const hasChildren = children.length > 0;
    rows.push({ todo, depth, hasChildren });
    if (hasChildren && expanded.has(todo.id)) {
      rows.push(...flattenTaskTree(children, allTodos, expanded, depth + 1));
    }
  }
  return rows;
}
