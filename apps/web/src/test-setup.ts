import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { JsonEventStore } from '@tododoro/storage';
import { _setEventStoreForTest } from './db.js';

beforeEach(() => {
  _setEventStoreForTest(new JsonEventStore());
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
