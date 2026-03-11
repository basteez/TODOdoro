import type { DomainEvent, EventStore } from '@tododoro/domain';

const STORAGE_KEY = 'tododoro:events';

export class JsonEventStore implements EventStore {
  async append(event: DomainEvent): Promise<void> {
    const existing = this.readFromStorage();
    existing.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  async readAll(): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage();
  }

  async readByAggregate(aggregateId: string): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage().filter(e => e.aggregateId === aggregateId);
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
