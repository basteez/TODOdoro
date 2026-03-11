import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { App } from './App.js';
import * as todoCommandsModule from './commands/todoCommands.js';
import { useCanvasStore } from './stores/useCanvasStore.js';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
} from '@tododoro/domain';
import type { Node } from '@xyflow/react';

// Capture the drag callbacks that App wires into ConstellationCanvas
let capturedDragStart: ((e: unknown, node: Node) => void) | undefined;
let capturedDragStop: ((e: unknown, node: Node) => void) | undefined;

vi.mock('@tododoro/ui', async (importActual) => {
  const actual = await importActual() as Record<string, unknown>;
  return {
    ...actual,
    ConstellationCanvas: (props: Record<string, unknown>) => {
      capturedDragStart = props.onNodeDragStart as typeof capturedDragStart;
      capturedDragStop = props.onNodeDragStop as typeof capturedDragStop;
      return null;
    },
    CanvasHint: () => null,
  };
});

vi.mock('./commands/todoCommands.js', () => ({
  handleDeclareTodo: vi.fn().mockResolvedValue({ ok: true }),
  handleRenameTodo: vi.fn().mockResolvedValue({ ok: true }),
  handlePositionTodo: vi.fn().mockResolvedValue({ ok: true }),
}));

function mockNode(id: string, x = 100, y = 200): Node {
  return { id, type: 'todoCard', position: { x, y }, data: {} } as Node;
}

function resetStore() {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: false,
  });
}

describe('App drag debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    capturedDragStart = undefined;
    capturedDragStop = undefined;
    vi.mocked(todoCommandsModule.handlePositionTodo).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call handlePositionTodo immediately on drag stop', () => {
    render(<App />);
    expect(capturedDragStop).toBeDefined();

    act(() => {
      capturedDragStop!(null, mockNode('node-1'));
    });

    expect(todoCommandsModule.handlePositionTodo).not.toHaveBeenCalled();
  });

  it('calls handlePositionTodo with node position after 200ms debounce', async () => {
    render(<App />);
    expect(capturedDragStop).toBeDefined();

    act(() => {
      capturedDragStop!(null, mockNode('node-1', 150, 250));
    });

    expect(todoCommandsModule.handlePositionTodo).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(todoCommandsModule.handlePositionTodo).toHaveBeenCalledOnce();
    expect(todoCommandsModule.handlePositionTodo).toHaveBeenCalledWith(
      'node-1',
      { x: 150, y: 250 },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('cancels the pending debounce when drag starts on the same node', async () => {
    render(<App />);

    act(() => {
      capturedDragStop!(null, mockNode('node-1', 100, 200));
    });

    act(() => {
      capturedDragStart!(null, mockNode('node-1'));
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(todoCommandsModule.handlePositionTodo).not.toHaveBeenCalled();
  });

  it('does NOT cancel a pending debounce when a different node starts dragging', async () => {
    render(<App />);

    act(() => {
      capturedDragStop!(null, mockNode('node-1', 100, 200));
    });

    // A different node starts dragging — node-1's pending persist must survive
    act(() => {
      capturedDragStart!(null, mockNode('node-2'));
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(todoCommandsModule.handlePositionTodo).toHaveBeenCalledOnce();
    expect(todoCommandsModule.handlePositionTodo).toHaveBeenCalledWith(
      'node-1',
      { x: 100, y: 200 },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
