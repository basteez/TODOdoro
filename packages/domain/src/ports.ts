import type { DomainEvent, SnapshotCreatedEvent } from './events.js';

export interface SnapshotReadResult {
  readonly snapshot: SnapshotCreatedEvent | null;
  readonly events: readonly DomainEvent[];
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  readAll(): Promise<readonly DomainEvent[]>;
  readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]>;
  count(): Promise<number>;
  readFromLatestSnapshot(): Promise<SnapshotReadResult>;
}

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  generate(): string;
}
