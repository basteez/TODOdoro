import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from './App.js';
import * as todoCommandsModule from './commands/todoCommands.js';
import { useCanvasStore } from './stores/useCanvasStore.js';
import {
  INITIAL_SHELF_STATE,
} from '@tododoro/domain';
import type { TodoListReadModel } from '@tododoro/domain';

let capturedTodoNodes: Array<{ data: Record<string, unknown> }>;
let capturedEulogyProps: Record<string, unknown> | null;
let capturedRitualProps: Record<string, unknown> | null;

vi.mock('@tododoro/ui', async (importActual) => {
  const actual = await importActual() as Record<string, unknown>;
  return {
    ...actual,
    ConstellationCanvas: (props: Record<string, unknown>) => {
      capturedTodoNodes = (props.nodes as typeof capturedTodoNodes) ?? [];
      return null;
    },
    CanvasHint: () => null,
    CompletionMoment: () => null,
    ReleaseEulogy: (props: Record<string, unknown>) => {
      capturedEulogyProps = props;
      return <div data-testid="release-eulogy" />;
    },
    ReleaseRitual: (props: Record<string, unknown>) => {
      capturedRitualProps = props;
      return <div data-testid="release-ritual" />;
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

function makeSessions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: `s-${i + 1}`,
    startedAt: Date.now() - (count - i) * 86400000,
    elapsedMs: 1500000,
  }));
}

function resetStore(pomodoroCount: number) {
  const sessions = makeSessions(pomodoroCount);
  useCanvasStore.setState({
    todos: {
      items: [{ id: 'todo-1', title: 'Test Todo', position: { x: 0, y: 0 }, pomodoroCount, status: 'active' as const }],
      pendingSessions: new Map(),
    } satisfies TodoListReadModel,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: {
      records: new Map([['todo-1', { todoId: 'todo-1', sessions }]]),
      pendingSessions: new Map(),
      pendingExplorations: new Map(),
      completedExplorations: new Map(),
    },
    isBooting: false,
  });
}

function triggerRelease() {
  const todoNode = capturedTodoNodes.find((n) => n.data.todoId === 'todo-1');
  const onRelease = todoNode?.data.onRelease as (id: string) => void;
  act(() => {
    onRelease('todo-1');
  });
}

describe('App release flow integration', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedTodoNodes = [];
    capturedEulogyProps = null;
    capturedRitualProps = null;
    vi.mocked(todoCommandsModule.handleReleaseTodo).mockClear();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('shows ReleaseEulogy first when pomodoroCount > 5', () => {
    resetStore(6);
    render(<App />);
    triggerRelease();

    expect(capturedEulogyProps).not.toBeNull();
    expect(capturedRitualProps).toBeNull();
    expect(capturedEulogyProps!.pomodoroCount).toBe(6);
  });

  it('shows ReleaseRitual directly when pomodoroCount <= 5', () => {
    resetStore(3);
    render(<App />);
    triggerRelease();

    expect(capturedRitualProps).not.toBeNull();
    expect(capturedEulogyProps).toBeNull();
  });

  it('transitions from Eulogy to Ritual on Continue', () => {
    resetStore(8);
    render(<App />);
    triggerRelease();

    expect(capturedEulogyProps).not.toBeNull();
    expect(capturedRitualProps).toBeNull();

    // Press Continue on the Eulogy
    const onContinue = capturedEulogyProps!.onContinue as () => void;
    act(() => {
      onContinue();
    });

    // Now Ritual should show, Eulogy should not be in DOM
    expect(capturedRitualProps).not.toBeNull();
    expect(screen.queryByTestId('release-eulogy')).toBeNull();
    expect(screen.queryByTestId('release-ritual')).not.toBeNull();
  });

  it('cancels entire flow when Escape pressed on Eulogy', () => {
    resetStore(7);
    render(<App />);
    triggerRelease();

    expect(capturedEulogyProps).not.toBeNull();

    const onCancel = capturedEulogyProps!.onCancel as () => void;
    act(() => {
      onCancel();
    });

    // Neither should be in DOM — flow cancelled
    expect(screen.queryByTestId('release-eulogy')).toBeNull();
    expect(screen.queryByTestId('release-ritual')).toBeNull();
    expect(todoCommandsModule.handleReleaseTodo).not.toHaveBeenCalled();
  });

  it('calls handleReleaseTodo after animation delay when reason selected', async () => {
    resetStore(2);
    render(<App />);
    triggerRelease();

    expect(capturedRitualProps).not.toBeNull();
    const onSelect = capturedRitualProps!.onSelect as (reason: string) => void;
    act(() => {
      onSelect('was_never_truly_mine');
    });

    // Not called immediately (animation delay)
    expect(todoCommandsModule.handleReleaseTodo).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(todoCommandsModule.handleReleaseTodo).toHaveBeenCalledOnce();
  });

  it('sets isLeaving on card after reason selected', () => {
    resetStore(2);
    render(<App />);
    triggerRelease();

    const onSelect = capturedRitualProps!.onSelect as (reason: string) => void;
    act(() => {
      onSelect('completed_its_purpose');
    });

    const todoNode = capturedTodoNodes.find((n) => n.data.todoId === 'todo-1');
    expect(todoNode?.data.isLeaving).toBe(true);
  });
});
