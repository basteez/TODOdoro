import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './useCanvasStore.js';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
  CURRENT_SCHEMA_VERSION,
} from '@tododoro/domain';
import type { TodoDeclaredEvent, TodoPositionedEvent } from '@tododoro/domain';

function resetStore() {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: true,
  });
}

describe('useCanvasStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('bootstrap', () => {
    it('sets isBooting to false after bootstrap', () => {
      expect(useCanvasStore.getState().isBooting).toBe(true);

      useCanvasStore.getState().bootstrap(
        INITIAL_TODO_LIST_STATE,
        INITIAL_SHELF_STATE,
        INITIAL_DEVOTION_RECORD_STATE,
      );

      expect(useCanvasStore.getState().isBooting).toBe(false);
    });

    it('sets todos, shelf, and devotionRecord from bootstrap arguments', () => {
      const customTodos = { ...INITIAL_TODO_LIST_STATE };
      const customShelf = { ...INITIAL_SHELF_STATE };
      const customDevotion = { ...INITIAL_DEVOTION_RECORD_STATE };

      useCanvasStore.getState().bootstrap(customTodos, customShelf, customDevotion);

      const state = useCanvasStore.getState();
      expect(state.todos).toBe(customTodos);
      expect(state.shelf).toBe(customShelf);
      expect(state.devotionRecord).toBe(customDevotion);
    });
  });

  describe('applyEvent', () => {
    beforeEach(() => {
      useCanvasStore.getState().bootstrap(
        INITIAL_TODO_LIST_STATE,
        INITIAL_SHELF_STATE,
        INITIAL_DEVOTION_RECORD_STATE,
      );
    });

    it('projects a TodoDeclared event into the todos read model', () => {
      const event: TodoDeclaredEvent = {
        eventType: 'TodoDeclared',
        eventId: 'evt-1',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        title: 'My first todo',
      };

      useCanvasStore.getState().applyEvent(event);

      const state = useCanvasStore.getState();
      expect(state.todos.items).toHaveLength(1);
      expect(state.todos.items[0]?.title).toBe('My first todo');
      expect(state.todos.items[0]?.id).toBe('todo-1');
    });

    it('projects a TodoPositioned event into the todos read model', () => {
      const declareEvent: TodoDeclaredEvent = {
        eventType: 'TodoDeclared',
        eventId: 'evt-1',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        title: 'Position me',
      };

      const positionEvent: TodoPositionedEvent = {
        eventType: 'TodoPositioned',
        eventId: 'evt-2',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        x: 100,
        y: 200,
      };

      useCanvasStore.getState().applyEvent(declareEvent);
      useCanvasStore.getState().applyEvent(positionEvent);

      const state = useCanvasStore.getState();
      expect(state.todos.items[0]?.position.x).toBe(100);
      expect(state.todos.items[0]?.position.y).toBe(200);
    });

    it('applies multiple events sequentially', () => {
      const event1: TodoDeclaredEvent = {
        eventType: 'TodoDeclared',
        eventId: 'evt-1',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        title: 'First',
      };

      const event2: TodoDeclaredEvent = {
        eventType: 'TodoDeclared',
        eventId: 'evt-2',
        aggregateId: 'todo-2',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        title: 'Second',
      };

      useCanvasStore.getState().applyEvent(event1);
      useCanvasStore.getState().applyEvent(event2);

      expect(useCanvasStore.getState().todos.items).toHaveLength(2);
    });

    it('does not change isBooting when applying events', () => {
      const event: TodoDeclaredEvent = {
        eventType: 'TodoDeclared',
        eventId: 'evt-1',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        title: 'Test',
      };

      useCanvasStore.getState().applyEvent(event);

      expect(useCanvasStore.getState().isBooting).toBe(false);
    });
  });
});
