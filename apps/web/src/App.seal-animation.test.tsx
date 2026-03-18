import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { App } from './App.js';
import * as todoCommandsModule from './commands/todoCommands.js';
import { useCanvasStore } from './stores/useCanvasStore.js';
import {
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
} from '@tododoro/domain';
import type { TodoListReadModel } from '@tododoro/domain';

let capturedCompletionDismiss: (() => void) | undefined;
let capturedTodoNodes: Array<{ data: { isLeaving?: boolean | undefined; todoId: string } }>;

vi.mock('@tododoro/ui', async (importActual) => {
  const actual = await importActual() as Record<string, unknown>;
  return {
    ...actual,
    ConstellationCanvas: (props: Record<string, unknown>) => {
      capturedTodoNodes = (props.nodes as typeof capturedTodoNodes) ?? [];
      return null;
    },
    CanvasHint: () => null,
    CompletionMoment: (props: Record<string, unknown>) => {
      capturedCompletionDismiss = props.onDismiss as typeof capturedCompletionDismiss;
      return <div data-testid="completion-moment" />;
    },
  };
});

vi.mock('./commands/todoCommands.js', () => ({
  handleDeclareTodo: vi.fn().mockResolvedValue({ ok: true }),
  handleRenameTodo: vi.fn().mockResolvedValue({ ok: true }),
  handlePositionTodo: vi.fn().mockResolvedValue({ ok: true }),
  handleSealTodo: vi.fn().mockResolvedValue({ ok: true }),
  handleReleaseTodo: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('./commands/sessionCommands.js', () => ({
  handleStartSession: vi.fn().mockResolvedValue({ ok: true }),
  handleCompleteSession: vi.fn().mockResolvedValue({ ok: true }),
  handleAbandonSession: vi.fn().mockResolvedValue({ ok: true }),
  handleAttributeExplorationSession: vi.fn().mockResolvedValue({ ok: true }),
}));

const todosWithItem: TodoListReadModel = {
  items: [{ id: 'todo-1', title: 'Test Todo', position: { x: 0, y: 0 }, pomodoroCount: 3, status: 'active' as const }],
  pendingSessions: new Map(),
};

function resetStore() {
  useCanvasStore.setState({
    todos: todosWithItem,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: false,
  });
  // Seed devotion records so seal flow reads timeSpan
  useCanvasStore.setState((s) => ({
    devotionRecord: {
      ...s.devotionRecord,
      records: new Map([['todo-1', { todoId: 'todo-1', sessions: [{ sessionId: 's-1', startedAt: Date.now(), elapsedMs: 1500000 }] }]]),
    },
  }));
}

describe('App seal animation flow', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    capturedCompletionDismiss = undefined;
    capturedTodoNodes = [];
    vi.mocked(todoCommandsModule.handleSealTodo).mockClear();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  function triggerSeal() {
    const todoNode = capturedTodoNodes.find((n) => n.data.todoId === 'todo-1');
    const onSeal = (todoNode?.data as Record<string, unknown>).onSeal as (id: string) => void;
    act(() => {
      onSeal('todo-1');
    });
  }

  it('does not call handleSealTodo immediately on CompletionMoment dismiss', () => {
    render(<App />);
    triggerSeal();

    expect(capturedCompletionDismiss).toBeDefined();
    act(() => {
      capturedCompletionDismiss!();
    });

    expect(todoCommandsModule.handleSealTodo).not.toHaveBeenCalled();
  });

  it('calls handleSealTodo after 250ms animation delay', async () => {
    render(<App />);
    triggerSeal();

    act(() => {
      capturedCompletionDismiss!();
    });

    expect(todoCommandsModule.handleSealTodo).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(todoCommandsModule.handleSealTodo).toHaveBeenCalledOnce();
  });

  it('sets isLeaving on the card after CompletionMoment dismiss', () => {
    render(<App />);
    triggerSeal();

    act(() => {
      capturedCompletionDismiss!();
    });

    const todoNode = capturedTodoNodes.find((n) => n.data.todoId === 'todo-1');
    expect(todoNode?.data.isLeaving).toBe(true);
  });

  it('calls handleSealTodo immediately (0ms) when prefers-reduced-motion is set', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    render(<App />);
    triggerSeal();

    act(() => {
      capturedCompletionDismiss!();
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(todoCommandsModule.handleSealTodo).toHaveBeenCalledOnce();
  });
});
