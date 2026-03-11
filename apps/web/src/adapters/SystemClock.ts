import type { Clock } from '@tododoro/domain';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
