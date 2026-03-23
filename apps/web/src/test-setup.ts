import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { JsonEventStore } from '@tododoro/storage';

vi.mock('./db.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db.js')>();
  return {
    ...actual,
    getEventStore: () => new JsonEventStore(),
  };
});

afterEach(() => {
  cleanup();
});

// jsdom does not implement ResizeObserver — React Flow requires it
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
