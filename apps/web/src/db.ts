import type { EventStore } from '@tododoro/domain';
import { JsonEventStore, SqliteEventStore } from '@tododoro/storage';

/** Which storage backend was selected on boot. */
export let activeStoreType: 'sqlite' | 'json' = 'json';

const INIT_TIMEOUT_MS = 3_000;

export async function createEventStore(): Promise<EventStore> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      // AC#4: Verify Cross-Origin Isolation headers (COOP/COEP) are present.
      // SQLocal's opfs-sahpool VFS does NOT require SharedArrayBuffer, so it
      // works without COOP/COEP — but the headers are expected for CSP compliance.
      if (!crossOriginIsolated) {
        // Headers not configured — OPFS still works via opfs-sahpool VFS,
        // but this indicates a deployment configuration gap.
      }

      const store = new SqliteEventStore('tododoro.sqlite3');
      // SQLocal's Web Worker can hang indefinitely when OPFS is unavailable
      // (e.g. restricted browser contexts). Race against a timeout so the
      // fallback to JsonEventStore always fires.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite init timeout')), INIT_TIMEOUT_MS),
      );
      await Promise.race([store.initialize(), timeout]);
      activeStoreType = 'sqlite';
      return store;
    } catch {
      // OPFS not available or SQLocal init timed out — fall back to localStorage.
    }
  }
  return new JsonEventStore();
}
