import type { Clock, IdGenerator } from './ports.js';
import type { SnapshotState } from './events.js';
import { INITIAL_TODO_LIST_STATE } from './projections/todoList.js';
import { INITIAL_SHELF_STATE } from './projections/shelf.js';
import { INITIAL_DEVOTION_RECORD_STATE } from './projections/devotionRecord.js';
import { INITIAL_ACTIVE_SESSION_STATE } from './projections/activeSession.js';

export const DUMMY_SNAPSHOT_STATE: SnapshotState = {
  todoList: INITIAL_TODO_LIST_STATE,
  shelf: INITIAL_SHELF_STATE,
  devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
  activeSession: INITIAL_ACTIVE_SESSION_STATE,
};

export class FakeClock implements Clock {
  private _now: number;
  constructor(now = 1_000_000) {
    this._now = now;
  }
  now(): number {
    return this._now;
  }
  advance(ms: number): void {
    this._now += ms;
  }
  set(now: number): void {
    this._now = now;
  }
}

export class FakeIdGenerator implements IdGenerator {
  private _counter = 0;
  generate(): string {
    return `test-id-${++this._counter}`;
  }
}
