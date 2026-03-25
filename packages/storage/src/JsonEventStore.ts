import type { DomainEvent, EventStore, SnapshotCreatedEvent, SnapshotReadResult } from '@tododoro/domain';

const STORAGE_KEY = 'tododoro:events';

export class JsonEventStore implements EventStore {
  async append(event: DomainEvent): Promise<void> {
    const existing = this.readFromStorage();
    if (existing.some(e => e.eventId === event.eventId)) {
      throw new Error(`UNIQUE constraint failed: duplicate eventId ${event.eventId}`);
    }
    existing.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  async readAll(): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage();
  }

  async readByAggregate(aggregateId: string): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage().filter(e => e.aggregateId === aggregateId);
  }

  async count(): Promise<number> {
    return this.readFromStorage().length;
  }

  async readFromLatestSnapshot(): Promise<SnapshotReadResult> {
    const allEvents = this.readFromStorage();

    let snapshotIndex = -1;
    for (let i = allEvents.length - 1; i >= 0; i--) {
      if (allEvents[i]!.eventType === 'SnapshotCreated') {
        snapshotIndex = i;
        break;
      }
    }

    if (snapshotIndex === -1) {
      return { snapshot: null, events: allEvents };
    }

    const snapshot = allEvents[snapshotIndex] as SnapshotCreatedEvent;
    const events = allEvents.slice(snapshotIndex + 1);
    return { snapshot, events };
  }

  private readFromStorage(): DomainEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as DomainEvent[]) : [];
    } catch {
      return [];
    }
  }
}
