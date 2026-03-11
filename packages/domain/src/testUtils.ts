import type { Clock, IdGenerator } from './ports.js';

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
