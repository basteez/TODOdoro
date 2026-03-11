import {
  declareTodo,
  positionTodo,
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
