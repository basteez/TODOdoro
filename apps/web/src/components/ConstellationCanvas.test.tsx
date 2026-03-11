import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useMemo } from 'react';
import { ConstellationCanvas, TodoCard } from '@tododoro/ui';
import type { TodoCardData } from '@tododoro/ui';
import type { Node, NodeTypes } from '@xyflow/react';

function makeNode(overrides: Partial<{ id: string; title: string; x: number; y: number }> = {}): Node<TodoCardData> {
  const { id = 'todo-1', title = 'Test todo', x = 0, y = 0 } = overrides;
  return {
    id,
    type: 'todoCard',
    position: { x, y },
    data: {
      title,
      todoId: id,
      sessionsCount: 0,
      isEditing: false,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      onRename: vi.fn(),
    },
  };
}

const nodeTypes: NodeTypes = { todoCard: TodoCard };

function TestCanvas({ nodes }: { nodes: Node<TodoCardData>[] }) {
  const nt = useMemo(() => nodeTypes, []);
  return <ConstellationCanvas nodes={nodes} nodeTypes={nt} />;
}

describe('ConstellationCanvas integration', () => {
  it('renders todo items passed as nodes', () => {
    const nodes = [makeNode({ title: 'My todo' })];
    render(<TestCanvas nodes={nodes} />);
    expect(screen.getByText('My todo')).toBeTruthy();
  });

  it('renders multiple todo nodes', () => {
    const nodes = [
      makeNode({ id: 'todo-1', title: 'First' }),
      makeNode({ id: 'todo-2', title: 'Second' }),
    ];
    render(<TestCanvas nodes={nodes} />);
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('renders empty canvas when no nodes provided', () => {
    render(<ConstellationCanvas />);
    expect(screen.queryByText('Test todo')).toBeNull();
  });
});
