import {
  declareTodo,
  positionTodo,
  renameTodo,
  sealTodo,
  reduceTodo,
  INITIAL_TODO_STATE,
} from '@tododoro/domain';
import type { EventStore, Clock, IdGenerator } from '@tododoro/domain';
import { useCanvasStore } from '../stores/useCanvasStore.js';

type Result = { ok: true } | { ok: false; error: string };

export async function handleDeclareTodo(
  title: string,
  position: { x: number; y: number },
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const activeCount = useCanvasStore.getState().todos.items.length;

    const declareResult = declareTodo(activeCount, title, clock, idGenerator);
    if (declareResult instanceof Error) {
      return { ok: false, error: declareResult.message };
    }

    // Build todo state after declare to feed into positionTodo
    const todoState = reduceTodo(INITIAL_TODO_STATE, declareResult);

    const positionResult = positionTodo(todoState, position.x, position.y, clock, idGenerator);
    if (positionResult instanceof Error) {
      return { ok: false, error: positionResult.message };
    }

    await eventStore.append(declareResult);
    useCanvasStore.getState().applyEvent(declareResult);

    await eventStore.append(positionResult);
    useCanvasStore.getState().applyEvent(positionResult);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handlePositionTodo(
  todoId: string,
  position: { x: number; y: number },
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readByAggregate(todoId);
    const state = events.reduce(reduceTodo, INITIAL_TODO_STATE);

    const event = positionTodo(state, position.x, position.y, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handleRenameTodo(
  todoId: string,
  newTitle: string,
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readByAggregate(todoId);
    const state = events.reduce(reduceTodo, INITIAL_TODO_STATE);

    const event = renameTodo(state, newTitle, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handleSealTodo(
  todoId: string,
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readByAggregate(todoId);
    const state = events.reduce(reduceTodo, INITIAL_TODO_STATE);

    const event = sealTodo(state, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
