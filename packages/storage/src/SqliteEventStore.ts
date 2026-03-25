import type { DomainEvent, EventStore, SnapshotCreatedEvent, SnapshotReadResult } from '@tododoro/domain';
import { SQLocal } from 'sqlocal';

// Raw SQL below must stay in sync with the Drizzle schema definition in
// ./schema.ts. The schema file is the type-safe reference; raw SQL is used
// here because SQLocal's tagged-template API is simpler for a single-table
// store. Drizzle ORM queries will replace this when read models grow complex.

export class SqliteEventStore implements EventStore {
  private readonly db: SQLocal;

  constructor(databasePath: string) {
    this.db = new SQLocal(databasePath);
  }

  async initialize(): Promise<void> {
    await this.db.sql`
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      )
    `;
    await this.db.sql`CREATE INDEX IF NOT EXISTS idx_events_agg_seq ON events(aggregate_id, seq)`;
    await this.db.sql`CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq)`;
    await this.db.sql`CREATE INDEX IF NOT EXISTS idx_events_event_type_seq ON events(event_type, seq)`;
  }

  async append(event: DomainEvent): Promise<void> {
    // Payload stores the full serialized event (denormalized). The dedicated
    // columns (event_id, event_type, etc.) serve as queryable indexes while
    // the payload is the single reconstruction source for readAll/readByAggregate.
    await this.db.sql`
      INSERT INTO events (event_id, event_type, aggregate_id, schema_version, timestamp, payload)
      VALUES (${event.eventId}, ${event.eventType}, ${event.aggregateId}, ${event.schemaVersion}, ${event.timestamp}, ${JSON.stringify(event)})
    `;
  }

  async readAll(): Promise<readonly DomainEvent[]> {
    const rows = await this.db.sql<{ payload: string }>`
      SELECT payload FROM events ORDER BY seq ASC
    `;
    return rows.flatMap((row) => {
      try { return [JSON.parse(row.payload) as DomainEvent]; }
      catch { return []; }
    });
  }

  async readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]> {
    const rows = await this.db.sql<{ payload: string }>`
      SELECT payload FROM events
      WHERE aggregate_id = ${aggregateId}
      ORDER BY seq ASC
    `;
    return rows.flatMap((row) => {
      try { return [JSON.parse(row.payload) as DomainEvent]; }
      catch { return []; }
    });
  }

  async count(): Promise<number> {
    const rows = await this.db.sql<{ 'COUNT(*)': number }>`
      SELECT COUNT(*) FROM events
    `;
    return rows[0]?.['COUNT(*)'] ?? 0;
  }

  async readFromLatestSnapshot(): Promise<SnapshotReadResult> {
    // Find the latest SnapshotCreated event by seq (descending)
    const snapshotRows = await this.db.sql<{ seq: number; payload: string }>`
      SELECT seq, payload FROM events
      WHERE event_type = ${'SnapshotCreated'}
      ORDER BY seq DESC
      LIMIT 1
    `;

    if (snapshotRows.length === 0) {
      // No snapshot — return all events
      const allEvents = await this.readAll();
      return { snapshot: null, events: allEvents };
    }

    const snapshotRow = snapshotRows[0]!;
    let snapshot: SnapshotCreatedEvent;
    try {
      snapshot = JSON.parse(snapshotRow.payload) as SnapshotCreatedEvent;
    } catch {
      // Corrupted snapshot — fall back to all events
      const allEvents = await this.readAll();
      return { snapshot: null, events: allEvents };
    }

    // Read only events after the snapshot
    const postSnapshotRows = await this.db.sql<{ payload: string }>`
      SELECT payload FROM events
      WHERE seq > ${snapshotRow.seq}
      ORDER BY seq ASC
    `;

    const events = postSnapshotRows.flatMap((row) => {
      try { return [JSON.parse(row.payload) as DomainEvent]; }
      catch { return []; }
    });

    return { snapshot, events };
  }

  async destroy(): Promise<void> {
    await this.db.destroy();
  }
}
