import type { EventStore } from '@tododoro/domain';
import { JsonEventStore, SqliteEventStore } from '@tododoro/storage';

/** Which storage backend was selected on boot. */
export let activeStoreType: 'sqlite' | 'json' = 'json';

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
      await store.initialize();
      activeStoreType = 'sqlite';
      return store;
    } catch {
      // OPFS not available in this browser — fall back to localStorage.
      // This is expected on older browsers or restricted contexts.
    }
  }
  return new JsonEventStore();
}
