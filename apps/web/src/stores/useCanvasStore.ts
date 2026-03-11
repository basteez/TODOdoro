import { create } from 'zustand';
import type {
  TodoListReadModel,
  ShelfReadModel,
  DevotionRecordReadModel,
} from '@tododoro/domain';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
} from '@tododoro/domain';

interface CanvasStoreState {
  todos: TodoListReadModel;
  shelf: ShelfReadModel;
  devotionRecord: DevotionRecordReadModel;
  isBooting: boolean;
  bootstrap(
    todos: TodoListReadModel,
    shelf: ShelfReadModel,
    devotionRecord: DevotionRecordReadModel,
  ): void;
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  todos: INITIAL_TODO_LIST_STATE,
  shelf: INITIAL_SHELF_STATE,
  devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
  isBooting: true,
  bootstrap(todos, shelf, devotionRecord) {
    set({ todos, shelf, devotionRecord, isBooting: false });
  },
}));
