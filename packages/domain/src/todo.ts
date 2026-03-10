import type {
  DomainEvent,
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoPositionedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
} from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { Clock, IdGenerator } from './ports.js';

export type TodoState =
  | { readonly status: 'nonexistent' }
  | {
      readonly status: 'active';
      readonly todoId: string;
      readonly title: string;
      readonly position: { readonly x: number; readonly y: number };
    }
  | {
      readonly status: 'sealed';
      readonly todoId: string;
      readonly title: string;
    }
  | {
      readonly status: 'released';
      readonly todoId: string;
      readonly title: string;
      readonly releaseReason: 'completed_its_purpose' | 'was_never_truly_mine';
    };

export const INITIAL_TODO_STATE: TodoState = { status: 'nonexistent' };

export function reduceTodo(state: TodoState, event: DomainEvent): TodoState {
  switch (event.eventType) {
    case 'TodoDeclared':
      if (state.status !== 'nonexistent') return state;
      return {
        status: 'active',
        todoId: event.aggregateId,
        title: event.title,
        position: { x: 0, y: 0 },
      };
    case 'TodoRenamed':
      if (state.status !== 'active') return state;
      return { ...state, title: event.title };
    case 'TodoPositioned':
      if (state.status !== 'active') return state;
      return { ...state, position: { x: event.x, y: event.y } };
    case 'TodoSealed':
      if (state.status !== 'active') return state;
      return { status: 'sealed', todoId: state.todoId, title: state.title };
    case 'TodoReleased':
      if (state.status !== 'active') return state;
      return {
        status: 'released',
        todoId: state.todoId,
        title: state.title,
        releaseReason: event.releaseReason,
      };
    default:
      return state;
  }
}

export function declareTodo(
  activeCount: number,
  title: string,
  clock: Clock,
  idGenerator: IdGenerator,
): TodoDeclaredEvent | Error {
  if (activeCount >= 100) {
    return new Error('Cannot declare todo: 100-card cap reached');
  }
  if (title.trim().length === 0) {
    return new Error('Todo title cannot be empty');
  }
  return {
    eventType: 'TodoDeclared',
    eventId: idGenerator.generate(),
    aggregateId: idGenerator.generate(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    title,
  };
}

export function renameTodo(
  state: TodoState,
  title: string,
  clock: Clock,
  idGenerator: IdGenerator,
): TodoRenamedEvent | Error {
  if (state.status !== 'active') {
    return new Error(`Cannot rename todo: status is '${state.status}'`);
  }
  if (title.trim().length === 0) {
    return new Error('Todo title cannot be empty');
  }
  return {
    eventType: 'TodoRenamed',
    eventId: idGenerator.generate(),
    aggregateId: state.todoId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    title,
  };
}

export function positionTodo(
  state: TodoState,
  x: number,
  y: number,
  clock: Clock,
  idGenerator: IdGenerator,
): TodoPositionedEvent | Error {
  if (state.status !== 'active') {
    return new Error(`Cannot position todo: status is '${state.status}'`);
  }
  return {
    eventType: 'TodoPositioned',
    eventId: idGenerator.generate(),
    aggregateId: state.todoId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    x,
    y,
  };
}

export function sealTodo(
  state: TodoState,
  clock: Clock,
  idGenerator: IdGenerator,
): TodoSealedEvent | Error {
  if (state.status !== 'active') {
    return new Error(`Cannot seal todo: status is '${state.status}'`);
  }
  return {
    eventType: 'TodoSealed',
    eventId: idGenerator.generate(),
    aggregateId: state.todoId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
  };
}

export function releaseTodo(
  state: TodoState,
  reason: 'completed_its_purpose' | 'was_never_truly_mine',
  clock: Clock,
  idGenerator: IdGenerator,
): TodoReleasedEvent | Error {
  if (state.status !== 'active') {
    return new Error(`Cannot release todo: status is '${state.status}'`);
  }
  return {
    eventType: 'TodoReleased',
    eventId: idGenerator.generate(),
    aggregateId: state.todoId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    releaseReason: reason,
  };
}
