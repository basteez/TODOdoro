import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable(
  'events',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    eventId: text('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    timestamp: integer('timestamp').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    index('idx_events_agg_seq').on(table.aggregateId, table.seq),
    index('idx_events_seq').on(table.seq),
  ],
);
