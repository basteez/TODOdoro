import { describe, it, expect } from 'vitest';
import {
  INITIAL_TODO_STATE,
  reduceTodo,
  declareTodo,
  renameTodo,
  positionTodo,
  sealTodo,
  releaseTodo,
} from './todo.js';
import type { TodoState } from './todo.js';
import type { SessionStartedEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import { FakeClock, FakeIdGenerator } from './testUtils.js';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function makeActiveState(
  todoId = 'todo-1',
  title = 'Buy milk',
  x = 0,
  y = 0,
): Extract<TodoState, { status: 'active' }> {
  return { status: 'active', todoId, title, position: { x, y } };
}

function makeSealedState(
  todoId = 'todo-1',
  title = 'Buy milk',
): Extract<TodoState, { status: 'sealed' }> {
  return { status: 'sealed', todoId, title };
}

function makeReleasedState(
  todoId = 'todo-1',
  title = 'Buy milk',
  releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' = 'completed_its_purpose',
): Extract<TodoState, { status: 'released' }> {
  return { status: 'released', todoId, title, releaseReason };
}

// ---------------------------------------------------------------------------
// INITIAL_TODO_STATE
// ---------------------------------------------------------------------------

describe('INITIAL_TODO_STATE', () => {
  it('has status nonexistent', () => {
    expect(INITIAL_TODO_STATE).toEqual({ status: 'nonexistent' });
  });
});

// ---------------------------------------------------------------------------
// reduceTodo
// ---------------------------------------------------------------------------

describe('reduceTodo', () => {
  it('TodoDeclared: transitions nonexistent → active', () => {
    const event = declareTodo(0, 'Write tests', new FakeClock(), new FakeIdGenerator());
    expect(event).not.toBeInstanceOf(Error);
    const result = reduceTodo(INITIAL_TODO_STATE, event as Exclude<typeof event, Error>);
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.title).toBe('Write tests');
      expect(result.position).toEqual({ x: 0, y: 0 });
    }
  });

  it('TodoDeclared: sets todoId from aggregateId', () => {
    const event = declareTodo(0, 'My todo', new FakeClock(), new FakeIdGenerator()) as Exclude<
      ReturnType<typeof declareTodo>,
      Error
    >;
    const result = reduceTodo(INITIAL_TODO_STATE, event);
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.todoId).toBe(event.aggregateId);
    }
  });

  it('TodoDeclared: returns state unchanged when not nonexistent (active)', () => {
    const active = makeActiveState();
    const event = declareTodo(0, 'Duplicate', new FakeClock(), new FakeIdGenerator()) as Exclude<
      ReturnType<typeof declareTodo>,
      Error
    >;
    const result = reduceTodo(active, event);
    expect(result).toBe(active);
  });

  it('TodoRenamed: updates title when active', () => {
    const active = makeActiveState();
    const renameEvent = renameTodo(active, 'Buy oat milk', new FakeClock(), new FakeIdGenerator());
    expect(renameEvent).not.toBeInstanceOf(Error);
    const result = reduceTodo(active, renameEvent as Exclude<typeof renameEvent, Error>);
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.title).toBe('Buy oat milk');
    }
  });

  it('TodoRenamed: returns state unchanged when not active (sealed)', () => {
    const sealed = makeSealedState();
    const renameEvent = {
      eventType: 'TodoRenamed' as const,
      eventId: 'e1',
      aggregateId: 'todo-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000,
      title: 'New title',
    };
    const result = reduceTodo(sealed, renameEvent);
    expect(result).toBe(sealed);
  });

  it('TodoPositioned: updates position when active', () => {
    const active = makeActiveState();
    const posEvent = positionTodo(active, 42, 99, new FakeClock(), new FakeIdGenerator());
    expect(posEvent).not.toBeInstanceOf(Error);
    const result = reduceTodo(active, posEvent as Exclude<typeof posEvent, Error>);
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.position).toEqual({ x: 42, y: 99 });
    }
  });

  it('TodoPositioned: returns state unchanged when not active (sealed)', () => {
    const sealed = makeSealedState();
    const posEvent = {
      eventType: 'TodoPositioned' as const,
      eventId: 'e1',
      aggregateId: 'todo-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000,
      x: 10,
      y: 20,
    };
    const result = reduceTodo(sealed, posEvent);
    expect(result).toBe(sealed);
  });

  it('TodoSealed: transitions active → sealed', () => {
    const active = makeActiveState();
    const sealEvent = sealTodo(active, new FakeClock(), new FakeIdGenerator());
    expect(sealEvent).not.toBeInstanceOf(Error);
    const result = reduceTodo(active, sealEvent as Exclude<typeof sealEvent, Error>);
    expect(result).toEqual({ status: 'sealed', todoId: 'todo-1', title: 'Buy milk' });
  });

  it('TodoSealed: returns state unchanged when not active (released)', () => {
    const released = makeReleasedState();
    const sealEvent = {
      eventType: 'TodoSealed' as const,
      eventId: 'e1',
      aggregateId: 'todo-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000,
    };
    const result = reduceTodo(released, sealEvent);
    expect(result).toBe(released);
  });

  it('TodoReleased: transitions active → released', () => {
    const active = makeActiveState();
    const releaseEvent = releaseTodo(
      active,
      'completed_its_purpose',
      new FakeClock(),
      new FakeIdGenerator(),
    );
    expect(releaseEvent).not.toBeInstanceOf(Error);
    const result = reduceTodo(active, releaseEvent as Exclude<typeof releaseEvent, Error>);
    expect(result).toEqual({
      status: 'released',
      todoId: 'todo-1',
      title: 'Buy milk',
      releaseReason: 'completed_its_purpose',
    });
  });

  it('TodoReleased: returns state unchanged when not active (sealed)', () => {
    const sealed = makeSealedState();
    const releaseEvent = {
      eventType: 'TodoReleased' as const,
      eventId: 'e1',
      aggregateId: 'todo-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000,
      releaseReason: 'completed_its_purpose' as const,
    };
    const result = reduceTodo(sealed, releaseEvent);
    expect(result).toBe(sealed);
  });

  it('default: ignores non-todo events (SessionStarted)', () => {
    const active = makeActiveState();
    const sessionEvent: SessionStartedEvent = {
      eventType: 'SessionStarted',
      eventId: 'sess-1',
      aggregateId: 'session-abc',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 2000,
      todoId: 'todo-1',
      configuredDurationMs: 25 * 60 * 1000,
    };
    const result = reduceTodo(active, sessionEvent);
    expect(result).toBe(active);
  });
});

// ---------------------------------------------------------------------------
// declareTodo
// ---------------------------------------------------------------------------

describe('declareTodo', () => {
  it('success: returns TodoDeclaredEvent with correct shape', () => {
    const clock = new FakeClock(5000);
    const ids = new FakeIdGenerator();
    const result = declareTodo(0, 'Learn TDD', clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('TodoDeclared');
    expect(event.title).toBe('Learn TDD');
    expect(event.timestamp).toBe(5000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(event.eventId).toBe('test-id-1');
    expect(event.aggregateId).toBe('test-id-2');
  });

  it('success: activeCount === 99 (boundary — cap not yet reached)', () => {
    const result = declareTodo(99, 'My 100th todo', new FakeClock(), new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
  });

  it('uses clock.now() for timestamp', () => {
    const clock = new FakeClock(999_999);
    const result = declareTodo(0, 'Clock test', clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).timestamp).toBe(999_999);
  });

  it('uses idGenerator.generate() for eventId and aggregateId', () => {
    const ids = new FakeIdGenerator();
    const result = declareTodo(0, 'Id test', new FakeClock(), ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventId).toBe('test-id-1');
    expect(event.aggregateId).toBe('test-id-2');
  });

  it('error: 100-card cap reached (activeCount === 100)', () => {
    const result = declareTodo(100, 'One too many', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Cannot declare todo: 100-card cap reached');
  });

  it('error: 100-card cap exceeded (activeCount > 100)', () => {
    const result = declareTodo(150, 'Way too many', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
  });

  it('error: empty title', () => {
    const result = declareTodo(0, '  ', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Todo title cannot be empty');
  });
});

// ---------------------------------------------------------------------------
// renameTodo
// ---------------------------------------------------------------------------

describe('renameTodo', () => {
  it('success: returns TodoRenamedEvent with correct shape', () => {
    const active = makeActiveState('todo-42', 'Old title');
    const clock = new FakeClock(7000);
    const ids = new FakeIdGenerator();
    const result = renameTodo(active, 'New title', clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('TodoRenamed');
    expect(event.title).toBe('New title');
    expect(event.aggregateId).toBe('todo-42');
    expect(event.eventId).toBe('test-id-1');
    expect(event.timestamp).toBe(7000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('error: nonexistent state', () => {
    const result = renameTodo(INITIAL_TODO_STATE, 'New title', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('nonexistent');
  });

  it('error: sealed state', () => {
    const result = renameTodo(makeSealedState(), 'New title', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('sealed');
  });

  it('error: released state', () => {
    const result = renameTodo(
      makeReleasedState(),
      'New title',
      new FakeClock(),
      new FakeIdGenerator(),
    );
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('released');
  });

  it('error: empty title', () => {
    const active = makeActiveState();
    const result = renameTodo(active, '', new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Todo title cannot be empty');
  });
});

// ---------------------------------------------------------------------------
// positionTodo
// ---------------------------------------------------------------------------

describe('positionTodo', () => {
  it('success: returns TodoPositionedEvent with correct shape', () => {
    const active = makeActiveState('todo-7');
    const clock = new FakeClock(3000);
    const ids = new FakeIdGenerator();
    const result = positionTodo(active, 100, 200, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('TodoPositioned');
    expect(event.x).toBe(100);
    expect(event.y).toBe(200);
    expect(event.aggregateId).toBe('todo-7');
    expect(event.eventId).toBe('test-id-1');
    expect(event.timestamp).toBe(3000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('error: nonexistent state', () => {
    const result = positionTodo(INITIAL_TODO_STATE, 10, 20, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('nonexistent');
  });

  it('error: sealed state', () => {
    const result = positionTodo(makeSealedState(), 10, 20, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('sealed');
  });

  it('error: released state', () => {
    const result = positionTodo(makeReleasedState(), 10, 20, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('released');
  });
});

// ---------------------------------------------------------------------------
// sealTodo
// ---------------------------------------------------------------------------

describe('sealTodo', () => {
  it('success: returns TodoSealedEvent with correct shape', () => {
    const active = makeActiveState('todo-99', 'Finish project');
    const clock = new FakeClock(8000);
    const ids = new FakeIdGenerator();
    const result = sealTodo(active, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('TodoSealed');
    expect(event.aggregateId).toBe('todo-99');
    expect(event.eventId).toBe('test-id-1');
    expect(event.timestamp).toBe(8000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('error: nonexistent state', () => {
    const result = sealTodo(INITIAL_TODO_STATE, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('nonexistent');
  });

  it('error: already-sealed state', () => {
    const result = sealTodo(makeSealedState(), new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('sealed');
  });

  it('error: released state', () => {
    const result = sealTodo(makeReleasedState(), new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('released');
  });
});

// ---------------------------------------------------------------------------
// releaseTodo
// ---------------------------------------------------------------------------

describe('releaseTodo', () => {
  it('success: reason completed_its_purpose', () => {
    const active = makeActiveState('todo-5', 'Read a book');
    const clock = new FakeClock(9000);
    const ids = new FakeIdGenerator();
    const result = releaseTodo(active, 'completed_its_purpose', clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('TodoReleased');
    expect(event.releaseReason).toBe('completed_its_purpose');
    expect(event.aggregateId).toBe('todo-5');
    expect(event.eventId).toBe('test-id-1');
    expect(event.timestamp).toBe(9000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('success: reason was_never_truly_mine', () => {
    const active = makeActiveState('todo-6', 'Clean garage');
    const result = releaseTodo(active, 'was_never_truly_mine', new FakeClock(), new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.releaseReason).toBe('was_never_truly_mine');
  });

  it('error: nonexistent state', () => {
    const result = releaseTodo(
      INITIAL_TODO_STATE,
      'completed_its_purpose',
      new FakeClock(),
      new FakeIdGenerator(),
    );
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('nonexistent');
  });

  it('error: sealed state (cannot release a sealed todo)', () => {
    const result = releaseTodo(
      makeSealedState(),
      'completed_its_purpose',
      new FakeClock(),
      new FakeIdGenerator(),
    );
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('sealed');
  });

  it('error: already-released state', () => {
    const result = releaseTodo(
      makeReleasedState(),
      'was_never_truly_mine',
      new FakeClock(),
      new FakeIdGenerator(),
    );
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('released');
  });
});
