import type { DomainEvent } from './events.js';

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  readAll(): Promise<readonly DomainEvent[]>;
  readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]>;
}

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  generate(): string;
}
