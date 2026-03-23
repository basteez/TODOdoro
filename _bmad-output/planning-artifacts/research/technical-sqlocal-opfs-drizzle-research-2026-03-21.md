---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'SQLocal, wa-sqlite, OPFS, Drizzle ORM for local-first SQLite storage in a Vite 7 React app'
research_goals: 'Viability assessment, Cross-Origin Isolation headers, Web Worker patterns, and testing strategy'
user_name: 'Tiziano'
date: '2026-03-21'
web_research_enabled: true
source_verification: true
---

# Local-First SQLite in the Browser: SQLocal, OPFS, and Drizzle ORM for Tododoro

**Date:** 2026-03-21
**Author:** Tiziano
**Research Type:** Technical

---

## Research Overview

This report investigates the viability of replacing tododoro's `localStorage`-backed `JsonEventStore` with a SQLite database running entirely in the browser via SQLocal, OPFS, and optionally Drizzle ORM. The research covers the full technology stack (SQLocal, wa-sqlite, OPFS, Drizzle ORM, Vite 7), integration patterns, architectural design, implementation approach, and testing strategy.

**Key finding:** The migration path is remarkably clean. Tododoro's event-sourced architecture with a well-defined `EventStore` interface means a new `SqliteEventStore` can be dropped in with zero changes to domain logic, projections, or React components. SQLocal's default `opfs-sahpool` VFS eliminates the Cross-Origin Isolation header requirement that was historically the biggest adoption blocker for SQLite-on-the-web.

For the full executive summary and strategic recommendations, see the [Research Synthesis](#research-synthesis) section at the end of this document.

---

## Technical Research Scope Confirmation

**Research Topic:** SQLocal, wa-sqlite, OPFS, Drizzle ORM for local-first SQLite storage in a Vite 7 React app
**Research Goals:** Viability assessment, Cross-Origin Isolation headers, Web Worker patterns, and testing strategy

**Technical Research Scope:**

- Architecture Analysis - SQLocal/wa-sqlite architecture, OPFS storage backend, Web Worker isolation, Drizzle ORM layering
- Implementation Approaches - Vite 7 COOP/COEP configuration, worker bundling, Drizzle schema/migration workflow
- Technology Stack - SQLocal, wa-sqlite, OPFS, Drizzle ORM, Vite 7, React
- Integration Patterns - data flow from React through Drizzle to OPFS-backed SQLite in a Web Worker
- Performance Considerations - OPFS throughput, worker communication overhead, database size limits, browser support
- Testing Strategy - OPFS-dependent code testing with Vitest, Playwright, mocking strategies

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-21

## Technology Stack Analysis

### SQLite-on-the-Web Landscape (2025-2026)

There are two primary approaches to running SQLite in the browser with OPFS persistence:

| Approach | Library | VFS Options | SharedArrayBuffer Required? | Cross-Origin Isolation Required? |
|---|---|---|---|---|
| **Official sqlite3-wasm** | `@sqlite.org/sqlite-wasm` | `opfs` (full), `opfs-sahpool` | `opfs` VFS: Yes; `opfs-sahpool`: **No** | Only for `opfs` VFS |
| **wa-sqlite** | `rhashimoto/wa-sqlite` | `IDBBatchAtomicVFS`, `OPFSCoopSyncVFS`, `OriginPrivateVFS` | No (uses Asyncify/JSPI instead) | No |

**Key distinction:** The official `opfs` VFS uses SharedArrayBuffer + Atomics to bridge synchronous SQLite C calls with the asynchronous OPFS API. wa-sqlite uses Asyncify (or JSPI) to achieve the same goal without SharedArrayBuffer, avoiding the COOP/COEP header requirement entirely.

The `opfs-sahpool` VFS (released in SQLite 3.43.0) is a newer official alternative that pools OPFS SyncAccessHandles, avoiding the SharedArrayBuffer requirement while delivering better performance than the original `opfs` VFS. However, it trades off file-system transparency (files are opaque pool entries, not individual OPFS files).

_Source: [The Current State Of SQLite Persistence On The Web (Nov 2025)](https://www.powersync.com/blog/sqlite-persistence-on-the-web)_
_Source: [SQLite Persistent Storage Options](https://sqlite.org/wasm/doc/trunk/persistence.md)_
_Source: [wa-sqlite GitHub](https://github.com/rhashimoto/wa-sqlite)_

### SQLocal (v0.17.0)

SQLocal is a lightweight wrapper around the **official `@sqlite.org/sqlite-wasm`** build that provides:

- **Automatic Web Worker orchestration** — spawns and manages the SQLite worker thread; OPFS access happens exclusively inside the worker
- **Built-in Mutex** — ensures SQL commands and transactions execute sequentially even when called concurrently from the main thread
- **ORM integration** — first-class `SQLocalDrizzle` and `SQLocalKysely` subclasses that expose `driver` / `batchDriver` properties for direct use with Drizzle and Kysely
- **VFS flexibility** — uses `opfs-sahpool` by default, which **does not require SharedArrayBuffer or Cross-Origin Isolation headers**

SQLocal abstracts away the complexity of worker creation, message passing, and VFS selection. The developer interacts with a simple async API from the main thread.

_Source: [SQLocal npm](https://www.npmjs.com/package/sqlocal)_
_Source: [SQLocal Drizzle Setup](https://sqlocal.dev/drizzle/setup)_
_Source: [SQLocal GitHub Releases](https://github.com/DallasHoff/sqlocal/releases)_

### wa-sqlite

wa-sqlite is a community-maintained WebAssembly build of SQLite with pluggable JavaScript VFS implementations. Key characteristics:

- **No SharedArrayBuffer dependency** — uses Asyncify (or the newer JSPI) to handle the sync/async bridge
- **Multiple VFS options** — IDBBatchAtomicVFS (IndexedDB-backed), OriginPrivateVFS (OPFS), OPFSCoopSyncVFS (OPFS with concurrent read support)
- **Lower-level API** — no built-in worker orchestration or ORM wrappers; you manage the worker and message passing yourself
- **Active development** — VFS rewrite in progress to support JSPI instead of Asyncify for smaller Wasm bundles and better performance

wa-sqlite is most useful when COOP/COEP headers are not feasible, or when custom VFS behavior is needed. However, SQLocal wrapping the official build is generally simpler for most use cases.

_Source: [wa-sqlite GitHub](https://github.com/rhashimoto/wa-sqlite)_
_Source: [wa-sqlite OPFS Discussion #44](https://github.com/rhashimoto/wa-sqlite/discussions/44)_

### Drizzle ORM (Browser/Client-Side)

Drizzle ORM is a TypeScript-first ORM with zero runtime overhead. Its SQLite support in the browser works through the **`sqlite-proxy` driver**, which SQLocal leverages:

```typescript
import { SQLocalDrizzle } from 'sqlocal/drizzle';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

const { driver, batchDriver } = new SQLocalDrizzle('database.sqlite3');
export const db = drizzle(driver, batchDriver);
```

**Capabilities:**
- Full type-safe query building with SQLite dialect
- Schema definitions via `sqliteTable()` with column types, indexes, relations
- Transaction support (use `SQLocalDrizzle.transaction()` instead of Drizzle's built-in, which cannot isolate from outside queries)

**Limitations — Client-Side Migrations:**
- `drizzle-kit` `migrate()` function requires Node.js APIs (`node:fs`, `node:crypto`) — **cannot run in the browser**
- No official browser-based migration runner yet (tracked in [GitHub Issue #1009](https://github.com/drizzle-team/drizzle-orm/issues/1009))
- **Workaround:** Generate migration SQL files with `drizzle-kit generate`, bundle them as static assets, and execute them at app startup via SQLocal's raw `sql()` method
- `drizzle-kit push` works for local development iteration but is a CLI tool, not a runtime API

_Source: [SQLocal Drizzle Setup](https://sqlocal.dev/drizzle/setup)_
_Source: [Drizzle ORM GitHub Discussion #243](https://github.com/drizzle-team/drizzle-orm/discussions/243)_
_Source: [Drizzle ORM GitHub Issue #1009](https://github.com/drizzle-team/drizzle-orm/issues/1009)_

### OPFS (Origin Private File System)

OPFS is a browser storage API that provides fast, private file access per origin:

**Browser Support (2026):**
- Chrome/Edge: Full support (since Chrome 102)
- Safari: Since Safari 15.2 / macOS 12.2
- Firefox: Stable support shipped

**Performance:**
- 3x-4x faster than IndexedDB for file I/O operations
- Synchronous `read()`/`write()` via `createSyncAccessHandle()` — **only available inside Web Workers**
- Main-thread access is limited to the slower asynchronous `FileSystemFileHandle` API

**Limitations:**
- **Web Worker required** for high-performance synchronous access (non-negotiable for SQLite)
- **Storage quotas** — typically 300 MB to several GB depending on browser/device
- **iOS/WKWebView** — 10 MB per-file limit (not relevant for standard browser tabs)
- **No cross-tab concurrency** — OPFS doesn't handle concurrent access between tabs; requires manual coordination
- **Opaque storage** — files are not visible in the user's file system; data is per-origin

_Source: [MDN - Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)_
_Source: [web.dev - Origin Private File System](https://web.dev/articles/origin-private-file-system)_
_Source: [RxDB - OPFS Storage](https://rxdb.info/rx-storage-opfs.html)_

### Vite 7

Vite 7.0 was released in 2026 with the following relevant changes:

- **Default browser target** changed from `'modules'` to `'baseline-widely-available'` (features stable for 30+ months)
- **Node.js 18 dropped** — requires Node.js 20+
- **Environment API** continues to evolve (experimental)
- **Smooth upgrade** from Vite 6 — no major breaking changes relevant to this stack

**Cross-Origin Isolation in Vite dev server:**
Vite does **not** natively set COOP/COEP headers on its dev server. Two approaches:

1. **`vite-plugin-cross-origin-isolation`** — community plugin that injects `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers on the dev server
2. **Custom `configureServer` middleware** — set headers manually in `vite.config.ts`:
   ```typescript
   server: {
     headers: {
       'Cross-Origin-Opener-Policy': 'same-origin',
       'Cross-Origin-Embedder-Policy': 'require-corp',
     }
   }
   ```

**Important caveat:** If using `opfs-sahpool` VFS (SQLocal's default), COOP/COEP headers are **not required** — making this configuration only necessary if you explicitly opt into the original `opfs` VFS or other SharedArrayBuffer-dependent features.

_Source: [Vite 7.0 Announcement](https://vite.dev/blog/announcing-vite7)_
_Source: [vite-plugin-cross-origin-isolation npm](https://www.npmjs.com/package/vite-plugin-cross-origin-isolation)_
_Source: [Vite GitHub Issue #3909](https://github.com/vitejs/vite/issues/3909)_

### Testing Ecosystem

**Vitest 4.0 (2025):**
- Browser Mode graduated to **stable** — runs tests in real browsers via Playwright or WebDriverIO provider
- Built-in visual regression testing
- `@vitest/web-worker` package for Web Worker simulation in Node.js tests
- Web APIs (localStorage, fetch, etc.) work out-of-the-box in Browser Mode

**Playwright (for E2E):**
- Full browser automation with Chromium, Firefox, WebKit
- Can configure custom response headers per-route to inject COOP/COEP for cross-origin isolation testing
- Supports parallel execution across browsers

**OPFS Testing Challenges:**
- OPFS is only available in secure contexts (HTTPS or localhost)
- Synchronous access handles only work inside Web Workers
- Vitest Node.js mode cannot access OPFS — requires Browser Mode or E2E with Playwright
- Need to ensure test isolation (clear OPFS between tests to prevent state leakage)

_Source: [Vitest Browser Mode](https://vitest.dev/guide/browser/)_
_Source: [Vitest 4.0 Release (InfoQ)](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/)_
_Source: [@vitest/web-worker npm](https://www.npmjs.com/package/@vitest/web-worker)_

### Technology Adoption Trends

_**Local-first is mainstream (2025-2026):**_ Major products like Notion have adopted WASM SQLite + OPFS for browser-side persistence, validating the approach for production use at scale.

_**SQLocal adoption growing:**_ v0.17.0 with active releases; the Drizzle + SQLocal combination is emerging as the most developer-friendly path for typed, local-first SQLite in the browser.

_**SAHPool is the pragmatic default:**_ The shift toward `opfs-sahpool` VFS means most new projects can avoid the COOP/COEP header complexity entirely, which was previously the biggest adoption blocker for SQLite-on-the-web.

_**Drizzle browser migrations remain a gap:**_ No official solution yet. The community pattern of bundling generated SQL migrations as static assets and running them at startup is the accepted workaround.

_Source: [Notion - How We Sped Up Notion in the Browser with WASM SQLite](https://www.notion.com/blog/how-we-sped-up-notion-in-the-browser-with-wasm-sqlite)_
_Source: [LogRocket - Offline-first Frontend Apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)_

## Integration Patterns Analysis

### Data Flow Architecture: React → Drizzle → SQLocal → OPFS

The full data path from a React component to persistent OPFS storage follows this layered architecture:

```
┌─────────────────────────────────────────────────────┐
│  MAIN THREAD                                        │
│                                                     │
│  React Component                                    │
│       │                                             │
│       ▼                                             │
│  Custom Hook (useDB / useTodos / etc.)              │
│       │                                             │
│       ▼                                             │
│  Drizzle ORM  (type-safe query builder)             │
│       │  drizzle(driver, batchDriver)               │
│       ▼                                             │
│  SQLocalDrizzle  (proxy driver + mutex)             │
│       │  postMessage ──────────────────┐            │
│       │                                │            │
├───────┼────────────────────────────────┼────────────┤
│  WEB WORKER                            │            │
│       │                                ▼            │
│       │         sqlite3 WASM engine                 │
│       │              │                              │
│       │              ▼                              │
│       │         opfs-sahpool VFS                    │
│       │              │                              │
│       │              ▼                              │
│       │         OPFS (SyncAccessHandle pool)        │
└───────┼─────────────────────────────────────────────┘
        ▼
   Response back to main thread via postMessage
```

**Key points:**
- SQLocal handles worker creation and postMessage orchestration internally — the developer never writes worker code
- Drizzle's `sqlite-proxy` driver delegates every query to SQLocal's `driver` callback, which serializes the SQL + params, posts them to the worker, and returns the result
- The built-in Mutex ensures sequential execution even under concurrent `db.select(...)` calls from multiple components
- All OPFS I/O happens synchronously inside the worker via `SyncAccessHandle`, never blocking the main thread

_Source: [SQLocal Drizzle Setup](https://sqlocal.dev/drizzle/setup)_
_Source: [Running SQLite in the Browser with OPFS and Web Workers](https://didof.dev/en/blog/sqlite-in-browser-with-opfs-and-web-workers/)_

### React Integration Pattern

The recommended pattern for integrating SQLocal + Drizzle in React:

**1. Singleton module (`src/lib/db.ts`):**
```typescript
import { SQLocalDrizzle } from 'sqlocal/drizzle';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const sqlocal = new SQLocalDrizzle('tododoro.sqlite3');
export const db = drizzle(sqlocal.driver, sqlocal.batchDriver, { schema });
export { sqlocal };
```

**2. Database initialization hook:**
```typescript
// useDatabase.ts
export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    runMigrations(sqlocal)
      .then(() => setReady(true))
      .catch(setError);
  }, []);

  return { db, ready, error };
}
```

**3. React Context provider** exposes `db` and `ready` state to the component tree; components render a loading state until `ready === true`.

**Why singleton, not Context value:** The Drizzle `db` instance and `SQLocalDrizzle` connection are stateless handles — they don't hold React state. Creating them once at module scope avoids re-initialization and is safe for concurrent access (the internal Mutex serializes operations). Context is only needed to gate rendering on migration completion.

_Source: [Using hooks and context with SQLite (React Native pattern, applicable to web)](https://www.jsparling.com/using-hooks-and-context-with-sqlite-for-expo-in-react-native/)_
_Source: [LogRocket - Offline-first Frontend Apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)_

### Client-Side Migration Strategy

Since Drizzle Kit's `migrate()` function requires Node.js APIs, client-side migrations require a manual approach:

**Approach: Bundled SQL migrations executed at startup**

1. **Generate migrations** with `drizzle-kit generate` during development (produces numbered `.sql` files in a `drizzle/` folder)
2. **Bundle migrations as static imports** — Vite can import `.sql` files as strings with `?raw` suffix:
   ```typescript
   import migration0001 from '../drizzle/0001_initial.sql?raw';
   import migration0002 from '../drizzle/0002_add_shelf.sql?raw';
   ```
3. **Track applied migrations** in a `_migrations` table inside the SQLite database itself:
   ```sql
   CREATE TABLE IF NOT EXISTS _migrations (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,
     applied_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
4. **Run pending migrations at app startup** before marking `ready = true`:
   ```typescript
   async function runMigrations(sqlocal: SQLocalDrizzle) {
     await sqlocal.sql`CREATE TABLE IF NOT EXISTS _migrations (...)`;
     const applied = await sqlocal.sql`SELECT name FROM _migrations`;
     const appliedSet = new Set(applied.map(r => r.name));

     for (const { name, sql } of allMigrations) {
       if (!appliedSet.has(name)) {
         await sqlocal.sql(sql);  // raw SQL execution
         await sqlocal.sql`INSERT INTO _migrations (name) VALUES (${name})`;
       }
     }
   }
   ```

**Confidence: High** — This pattern is widely used in the local-first community and is the recommended workaround per Drizzle ORM GitHub discussions.

_Source: [Drizzle ORM GitHub Issue #1009](https://github.com/drizzle-team/drizzle-orm/issues/1009)_
_Source: [Drizzle ORM GitHub Discussion #243](https://github.com/drizzle-team/drizzle-orm/discussions/243)_
_Source: [SQLite Versioning & Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)_

### Vite Worker Bundling

SQLocal spawns its own internal Web Worker, so no manual worker setup is needed. However, understanding Vite's worker bundling is relevant for debugging and custom extensions:

**Vite-supported patterns:**
```typescript
// Pattern 1: Query string import (Vite-specific)
import MyWorker from './worker.ts?worker';
const worker = new MyWorker();

// Pattern 2: URL constructor (web-standard, recommended)
const worker = new Worker(
  new URL('./worker.ts', import.meta.url),
  { type: 'module' }
);
```

**Critical requirement:** The URL string in `new URL(...)` must be a **static string literal** — Vite performs static analysis at build time and will skip bundling if the path is dynamic.

**SQLocal's internal worker:** SQLocal bundles its own worker script. In Vite builds, this means the worker is resolved and bundled as part of `node_modules/sqlocal` processing. No additional Vite worker configuration is required.

_Source: [Web Workers and Vite](https://nabeelvalley.co.za/blog/2025/06-01/web-workers/)_
_Source: [Vite GitHub Issue #5979](https://github.com/vitejs/vite/issues/5979)_

### Main Thread ↔ Worker Communication

SQLocal abstracts away the postMessage layer entirely, but the underlying communication pattern is worth understanding:

**SQLocal's approach:** Direct `postMessage` with a built-in request/response correlation system (message IDs) and a main-thread Mutex. The developer never interacts with the worker directly.

**Alternative: Comlink (Google Chrome Labs)** — A 1.1 kB library that wraps `postMessage` with ES6 Proxies, turning worker functions into async main-thread callables. Not needed with SQLocal (it handles this internally), but useful if you build custom worker-based services alongside SQLocal.

**Alternative: bidc (Vercel, 2025)** — A newer bidirectional channel library with extended serialization support. Not yet widely adopted but worth monitoring.

_Source: [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink)_
_Source: [Comlink and Web Workers (LogRocket)](https://blog.logrocket.com/comlink-web-workers-match-made-in-heaven/)_

### Database Lifecycle & Backup/Restore

SQLocal provides lifecycle hooks for database management:

- **`onConnect` callback** — fires when the SQLocal instance initializes and after any `overwriteDatabaseFile` or `deleteDatabaseFile` call. Ideal for running migrations.
- **`overwriteDatabaseFile(file)`** — replaces the current OPFS database with a `File`, `Blob`, or `ReadableStream`. Accepts an optional callback that runs after overwrite but before other clients can access the new database.
- **`deleteDatabaseFile()`** — removes the database from OPFS. Optional callback for cleanup.

**Use cases:** Import/export for user data portability, restoring from backup, resetting the database during development or testing.

_Source: [SQLocal GitHub Releases](https://github.com/DallasHoff/sqlocal/releases)_

### Cross-Origin Isolation Integration

**When using `opfs-sahpool` (SQLocal default):** No COOP/COEP headers are needed. This is the simplest path.

**When using the full `opfs` VFS (SharedArrayBuffer required):**

| Environment | Configuration |
|---|---|
| **Vite dev server** | `vite-plugin-cross-origin-isolation` or manual `server.headers` in `vite.config.ts` |
| **Production (self-hosted)** | Server response headers: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) |
| **Static hosting (GitHub Pages, Netlify)** | Service worker approach via `coi-serviceworker` to inject headers client-side |
| **Playwright tests** | `route.fulfill()` or launch args to inject headers per test context |

**Critical caveat for COEP `require-corp`:** Every cross-origin resource (images, scripts, fonts from CDNs) must include `Cross-Origin-Resource-Policy: cross-origin` headers, or they will be blocked. The `credentialless` COEP value is more permissive but has narrower browser support.

_Source: [web.dev - Making your website cross-origin isolated](https://web.dev/articles/coop-coep)_
_Source: [web.dev - Cross-origin isolation guide](https://web.dev/articles/cross-origin-isolation-guide)_
_Source: [coi-serviceworker GitHub](https://github.com/gzuidhof/coi-serviceworker)_

### Multi-Tab Concurrency

OPFS does not natively handle concurrent access from multiple tabs. Key considerations:

- **`opfs-sahpool` VFS:** Uses a pool of `SyncAccessHandle` objects. Only one handle can be open per file at a time. Multiple tabs opening the same database will contend for access.
- **SQLocal Mutex:** Serializes operations within a single tab but does **not** coordinate across tabs.
- **Recommended approach for tododoro:** Since this is a single-user productivity app, tab-level locking (only one active tab writes) is acceptable. A `BroadcastChannel` or `navigator.locks` API can coordinate which tab holds the write lock.

_Source: [MDN - Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)_
_Source: [The Current State Of SQLite Persistence On The Web (Nov 2025)](https://www.powersync.com/blog/sqlite-persistence-on-the-web)_

## Architectural Patterns and Design

### System Architecture: Local-First with SQLite as Source of Truth

The core architectural principle for tododoro's local-first approach: **SQLite is the single source of truth for all application state.** React component state is a derived cache of the database, not the other way around.

```
┌─────────────────────────────────────────────────────┐
│  Traditional SPA          Local-First (tododoro)    │
│                                                     │
│  API → React State        SQLite (OPFS) → React UI │
│  (server is truth)        (client DB is truth)      │
│  Network-dependent        Instant, offline-capable  │
│  Optimistic updates       Reads are always local    │
└─────────────────────────────────────────────────────┘
```

**Implications for tododoro:**
- No API calls for CRUD operations — all reads/writes go to the local SQLite database
- The UI always reflects the latest database state without loading spinners for data operations
- The database persists across sessions via OPFS — reopening the app is instant
- Future sync (if ever needed) becomes an additive layer, not a rewrite

_Source: [PowerSync - Local-First State Management With SQLite](https://www.powersync.com/blog/local-first-state-management-with-sqlite)_
_Source: [LogRocket - Offline-first Frontend Apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)_

### Reactive Query Architecture

SQLocal provides a built-in **reactive query** system that eliminates manual cache invalidation:

```typescript
// Enable reactive mode on the SQLocal instance
const sqlocal = new SQLocalDrizzle('tododoro.sqlite3', { reactive: true });

// Subscribe to a query — callback fires on initial run
// and again whenever queried tables change
const { subscribe, unsubscribe } = sqlocal.reactiveQuery(
  sql`SELECT * FROM todos WHERE status = 'active'`
);

subscribe((rows) => {
  // Called automatically when 'todos' table is mutated
  setTodos(rows);
});

// Cleanup on unmount
unsubscribe();
```

**Key behaviors:**
- Subscriptions automatically re-run when **any mutation** touches the tables referenced in the query
- Works **across SQLocal instances** and even **across browser tabs/windows** (when both have `reactive: true`)
- Mutations inside a **transaction** do not trigger reactive callbacks until the transaction commits — preventing inconsistent intermediate states
- Cleanup via `unsubscribe()` maps naturally to React's `useEffect` return cleanup

**Architectural pattern:** This is analogous to a **live query / materialized view** pattern. Instead of React components imperatively refetching after mutations, the database pushes updates to subscribers. This inverts the control flow:

```
Traditional:  Component → mutate() → refetch() → setState()
Reactive:     Component → mutate() → [DB notifies] → callback → setState()
```

This eliminates an entire class of bugs where a component forgets to refetch after a mutation, or multiple components need to coordinate cache invalidation.

_Source: [SQLocal reactiveQuery API](https://sqlocal.dev/api/reactivequery)_
_Source: [SQLocal GitHub Releases](https://github.com/DallasHoff/sqlocal/releases)_

### Data Layer Design Pattern

The recommended architecture separates concerns into three layers:

**Layer 1 — Schema (`src/db/schema.ts`)**
Drizzle `sqliteTable()` definitions. Pure TypeScript, no runtime behavior. Shared between migration generation and query building.

**Layer 2 — Repository (`src/db/repositories/`)**
Functions that encapsulate database operations per domain entity. Each repository file imports `db` from the singleton module and exports typed async functions:

```typescript
// src/db/repositories/todos.ts
import { db } from '../client';
import { todos } from '../schema';
import { eq } from 'drizzle-orm';

export const todoRepo = {
  getAll: () => db.select().from(todos),
  getActive: () => db.select().from(todos).where(eq(todos.status, 'active')),
  create: (data: NewTodo) => db.insert(todos).values(data),
  complete: (id: number) =>
    db.update(todos).set({ status: 'completed' }).where(eq(todos.id, id)),
};
```

**Layer 3 — React Hooks (`src/hooks/`)**
Custom hooks that combine repository calls with SQLocal's reactive queries and React state:

```typescript
// src/hooks/useTodos.ts
export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const { subscribe, unsubscribe } = sqlocal.reactiveQuery(
      sql`SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC`
    );
    subscribe((rows) => setTodos(rows));
    return () => unsubscribe();
  }, []);

  return {
    todos,
    create: todoRepo.create,
    complete: todoRepo.complete,
  };
}
```

**Why this pattern:**
- Schema definitions are reusable by both Drizzle Kit (migration gen) and runtime queries
- Repositories are testable in isolation (mock `db`)
- Hooks encapsulate reactivity and expose a clean API to components
- Components never import `db` or `sqlocal` directly — only hooks and actions

_Source: [Martin Fowler - Modularizing React Applications](https://martinfowler.com/articles/modularizing-react-apps.html)_
_Source: [React Architecture Pattern and Best Practices (GeeksforGeeks)](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/)_

### Storage Persistence and Eviction Protection

OPFS data is **best-effort by default** — the browser may evict it under storage pressure. For a todo app where the database is the only copy of the user's data, this is a critical risk.

**Mitigation: `navigator.storage.persist()`**

```typescript
// Call once at app startup
const isPersisted = await navigator.storage.persist();
if (!isPersisted) {
  console.warn('Browser denied persistent storage — data may be evicted');
}
```

**Browser behavior:**
| Browser | Persistence behavior |
|---|---|
| Chrome/Edge | Auto-granted if site is installed as PWA, bookmarked, or has significant engagement |
| Firefox | Shows a permission prompt to the user |
| Safari | Auto-granted based on user interaction heuristics |

**Additional safeguard:** Offer a manual "Export Database" feature via SQLocal's `getDatabaseFile()` → `Blob` → `URL.createObjectURL()` → download. This gives users a recovery path regardless of browser eviction.

**Storage quota:** OPFS shares the origin's storage quota (typically up to 60% of disk space in Chrome, with per-origin limits). A todo app's database will be in the KB-to-low-MB range, well within limits.

_Source: [MDN - Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)_
_Source: [MDN - StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)_

### Data Integrity and Error Handling

SQLite in the browser introduces unique corruption vectors:

**Known risks:**
1. **Multi-tab writes without coordination** — two tabs writing simultaneously can corrupt the database file if the VFS doesn't handle locking correctly
2. **Browser crashes during write** — OPFS writes are not journaled at the browser level; SQLite's WAL/journal provides the safety net
3. **Storage eviction mid-operation** — extremely rare but theoretically possible if the browser is under severe memory pressure

**Mitigation patterns:**

1. **SQLite's built-in journaling** — even in the browser, SQLite's WAL (Write-Ahead Logging) protects against corruption from incomplete writes. The `opfs-sahpool` VFS supports this.

2. **Single-writer architecture** — for tododoro, enforce that only one tab writes at a time:
   ```typescript
   // Use navigator.locks to ensure single writer
   await navigator.locks.request('tododoro-db-write', async () => {
     await db.insert(todos).values(newTodo);
   });
   ```

3. **Integrity checks** — run `PRAGMA integrity_check` periodically or on startup to detect corruption early:
   ```typescript
   const result = await sqlocal.sql`PRAGMA integrity_check`;
   if (result[0]?.integrity_check !== 'ok') {
     // Offer user to export remaining data and recreate DB
   }
   ```

4. **`delete-before-open=1` URI flag** (SQLite 3.46+) — ensures clean state recovery if a database file is corrupted beyond repair.

_Source: [SQLite Forum - Rare Corruption using SQLite WASM](https://sqlite.org/forum/forumpost/61323873ca5fd3f8)_
_Source: [Notion - How We Sped Up Notion in the Browser with WASM SQLite](https://www.notion.com/blog/how-we-sped-up-notion-in-the-browser-with-wasm-sqlite)_
_Source: [SQLite Error Handling Best Practices](https://www.sqliteforum.com/p/error-handling-in-sqlite-best-practices)_

### State Management Integration

**Recommendation: SQLite replaces global state management for persistent data.**

In a traditional React SPA, you might use Zustand/Redux for todo state. With SQLocal's reactive queries, the database fills this role:

| Concern | Traditional SPA | Local-First with SQLocal |
|---|---|---|
| Persistent data (todos, sessions) | API + Redux/Zustand | SQLite (via Drizzle) + reactive queries |
| Ephemeral UI state (modals, form inputs) | `useState` / Zustand | `useState` / Zustand (unchanged) |
| Derived/computed data | Selectors / `useMemo` | SQL queries (computed at the DB level) |
| Cross-component data sharing | Context / global store | Reactive query subscriptions |

**Key insight:** You don't need to eliminate Zustand or other state libraries. They're still useful for ephemeral UI state (timer running, modal open, drag-in-progress). But persistent domain data should live exclusively in SQLite, avoiding the dual-source-of-truth problem.

_Source: [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)_
_Source: [PowerSync - Local-First State Management With SQLite](https://www.powersync.com/blog/local-first-state-management-with-sqlite)_

### Deployment Architecture

Since this is a purely client-side app with no backend, deployment is straightforward:

```
┌──────────────────────────────────────────────┐
│  Static Hosting (Vercel, Netlify, GH Pages)  │
│                                              │
│  index.html + JS/CSS bundles + worker.js     │
│  (+ .wasm file for sqlite3)                  │
│                                              │
│  Response Headers (if using opfs VFS):       │
│  - COOP: same-origin                         │
│  - COEP: require-corp                        │
│                                              │
│  If using opfs-sahpool (SQLocal default):    │
│  - No special headers needed                 │
└──────────────────────────────────────────────┘
```

**Serving the `.wasm` file:** Ensure the hosting platform serves `.wasm` files with `Content-Type: application/wasm`. Most modern hosts (Vercel, Netlify) handle this automatically. Vite's build output includes the wasm file as a static asset.

**PWA considerations:** Adding a service worker for offline asset caching makes the app fully functional without network access after first load — complementing the OPFS data persistence.

_Source: [Vite 7.0 Announcement](https://vite.dev/blog/announcing-vite7)_

## Implementation Approaches and Technology Adoption

### Current Architecture Analysis

The tododoro codebase reveals a well-structured **event-sourced** architecture:

```
Monorepo (Turborepo + pnpm)
├── apps/web        — Vite 7, React 19, Zustand, Tailwind CSS 4
├── packages/domain  — Event types, aggregates, projections, ports
├── packages/storage — JsonEventStore (localStorage-backed)
├── packages/ui      — Shared UI components
└── packages/eslint-config, typescript-config
```

**Key interfaces in `@tododoro/domain`:**
- `EventStore` — `append()`, `readAll()`, `readByAggregate()` — **the seam we'll replace**
- `DomainEvent` — union of 10 event types (TodoDeclared, SessionStarted, SnapshotCreated, etc.)
- `SnapshotState` — projections snapshotted every 500 events for fast replay
- `Clock`, `IdGenerator` — testability ports

**Current storage:** `JsonEventStore` serializes the entire event array to `localStorage` under `tododoro:events`. This has a hard **~5 MB limit** in most browsers and performance degrades as the event list grows (full JSON parse/serialize on every append).

### Adoption Strategy: `SqliteEventStore` — Drop-In Replacement

**The cleanest path:** Implement a new `SqliteEventStore` class in `@tododoro/storage` that implements the existing `EventStore` interface using SQLocal. The domain model, projections, and React layer remain **completely unchanged**.

```
┌─────────────────────────────────────────────────────┐
│  BEFORE                    AFTER                    │
│                                                     │
│  JsonEventStore            SqliteEventStore          │
│  └── localStorage          └── SQLocal              │
│       (5 MB limit)              └── OPFS            │
│       (full JSON parse)              (GB+ capacity) │
│       (synchronous)                  (indexed SQL)  │
└─────────────────────────────────────────────────────┘
```

**Why this approach over Drizzle CRUD tables:**
1. **Zero domain changes** — the `EventStore` interface is the only contract between storage and the rest of the app
2. **Event sourcing stays** — the app's mental model, snapshots, and replay logic are preserved
3. **Migration is trivial** — export events from localStorage, import into SQLite, done
4. **Drizzle is optional** — for an event store with 2-3 tables, raw SQLocal `sql` tagged templates may be simpler than adding Drizzle's schema/proxy overhead. Drizzle becomes valuable later if you add CRUD read models or complex queries.

### Proposed SQLite Schema

```sql
-- Core event store
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  timestamp INTEGER NOT NULL,
  payload TEXT NOT NULL  -- JSON-serialized event data
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id);
CREATE INDEX idx_events_type ON events(event_type);

-- Snapshots for fast projection replay
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,  -- event_id of the SnapshotCreated event
  state TEXT NOT NULL,     -- JSON-serialized SnapshotState
  timestamp INTEGER NOT NULL
);

-- Migration tracking
CREATE TABLE _migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Why `payload` as JSON text:** Event sourcing stores events as immutable facts. The full DomainEvent (with all its type-specific fields) is serialized to JSON in `payload`. This avoids needing a separate table per event type and allows schema evolution via the `schemaVersion` field — exactly how the current `JsonEventStore` works.

### SqliteEventStore Implementation Sketch

```typescript
// packages/storage/src/SqliteEventStore.ts
import { SQLocal } from 'sqlocal';
import type { DomainEvent, EventStore } from '@tododoro/domain';

export class SqliteEventStore implements EventStore {
  private sqlocal: SQLocal;

  constructor(dbName = 'tododoro.sqlite3') {
    this.sqlocal = new SQLocal(dbName);
  }

  async initialize(): Promise<void> {
    await this.sqlocal.sql`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      )`;
    await this.sqlocal.sql`
      CREATE INDEX IF NOT EXISTS idx_events_aggregate
        ON events(aggregate_id)`;
  }

  async append(event: DomainEvent): Promise<void> {
    await this.sqlocal.sql`
      INSERT INTO events (event_id, event_type, aggregate_id,
                          schema_version, timestamp, payload)
      VALUES (${event.eventId}, ${event.eventType}, ${event.aggregateId},
              ${event.schemaVersion}, ${event.timestamp},
              ${JSON.stringify(event)})`;
  }

  async readAll(): Promise<readonly DomainEvent[]> {
    const rows = await this.sqlocal.sql`
      SELECT payload FROM events ORDER BY id ASC`;
    return rows.map(r => JSON.parse(r.payload));
  }

  async readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]> {
    const rows = await this.sqlocal.sql`
      SELECT payload FROM events
      WHERE aggregate_id = ${aggregateId}
      ORDER BY id ASC`;
    return rows.map(r => JSON.parse(r.payload));
  }
}
```

**Note:** SQLocal's `sql` tagged template automatically handles parameter binding (preventing SQL injection) and runs queries through the Web Worker with Mutex serialization.

### Data Migration from localStorage

One-time migration at first launch with the new storage:

```typescript
async function migrateFromLocalStorage(store: SqliteEventStore): Promise<void> {
  const raw = localStorage.getItem('tododoro:events');
  if (!raw) return;

  const events: DomainEvent[] = JSON.parse(raw);
  for (const event of events) {
    await store.append(event);
  }

  // Keep localStorage as backup for one version,
  // then remove in subsequent release
  localStorage.setItem('tododoro:events:migrated', 'true');
}
```

### Development Workflow

**Schema changes:**

```
1. Edit SQL in SqliteEventStore.initialize() or migration files
2. During dev: SQLocal recreates DB on schema change (delete OPFS DB via DevTools)
3. For releases: Add numbered migration file, import as ?raw, execute at startup
```

**Drizzle Kit integration (optional, for later):**

If Drizzle is adopted for read models or complex queries:
```bash
# drizzle.config.ts points at schema definitions
npx drizzle-kit generate    # → drizzle/0001_initial.sql
npx drizzle-kit push        # → rapid local dev iteration
```

Generated `.sql` files are imported with Vite's `?raw` suffix and executed via SQLocal at startup. The `_migrations` table tracks what's been applied.

_Source: [Drizzle Kit CLI (DeepWiki)](https://deepwiki.com/drizzle-team/drizzle-orm/3-drizzle-kit-(cli))_
_Source: [Drizzle push to SQLite](https://andriisherman.medium.com/migrations-with-drizzle-just-got-better-push-to-sqlite-is-here-c6c045c5d0fb)_

### Testing Strategy

This is the most nuanced area. The existing test suite uses Vitest with jsdom. SQLocal requires real browser APIs (OPFS, Web Workers). Here's a layered testing strategy:

#### Layer 1: Unit Tests (Vitest + jsdom — existing approach, unchanged)

**What to test:** Domain logic, projections, aggregates, event replay — everything in `@tododoro/domain`.

**How:** These tests don't touch storage. They use test doubles or the existing in-memory patterns. **No changes needed.**

```typescript
// Existing pattern — remains valid
const store = new InMemoryEventStore(); // or mock
await store.append(todoDeclaredEvent);
const projected = projectTodoList(await store.readAll());
expect(projected).toEqual(...);
```

#### Layer 2: Integration Tests for SqliteEventStore (Vitest Browser Mode + Playwright)

**What to test:** `SqliteEventStore` against a real SQLocal instance with OPFS.

**Why Browser Mode:** SQLocal requires Web Worker and OPFS APIs — not available in jsdom or Node.js. Vitest Browser Mode runs tests in a real Chromium instance via Playwright.

**Configuration (`vitest.config.browser.ts`):**

```typescript
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    name: 'browser',
    include: ['**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: playwright({ launch: { headless: true } }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

**Test file (`SqliteEventStore.browser.test.ts`):**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteEventStore } from './SqliteEventStore';

describe('SqliteEventStore', () => {
  let store: SqliteEventStore;

  beforeEach(async () => {
    // Each test gets a fresh database
    store = new SqliteEventStore('test.sqlite3');
    await store.initialize();
    // Clear all data between tests
    await store.sql`DELETE FROM events`;
  });

  it('appends and reads events', async () => {
    const event = makeTodoDeclaredEvent({ title: 'Test' });
    await store.append(event);
    const events = await store.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('TodoDeclared');
  });

  it('reads by aggregate', async () => {
    await store.append(makeTodoDeclaredEvent({ aggregateId: 'a' }));
    await store.append(makeTodoDeclaredEvent({ aggregateId: 'b' }));
    const events = await store.readByAggregate('a');
    expect(events).toHaveLength(1);
  });
});
```

**Key considerations:**
- Tests use `*.browser.test.ts` naming convention to separate from jsdom tests
- Vitest workspace config runs jsdom and browser tests in parallel with separate configs
- `beforeEach` clears data via SQL `DELETE` — faster than recreating the DB
- SQLocal's `deleteDatabaseFile()` can be used in `afterAll` for full cleanup

_Source: [Vitest Browser Mode](https://vitest.dev/guide/browser/)_
_Source: [Vitest Test Projects](https://vitest.dev/guide/projects)_
_Source: [@vitest/browser-playwright npm](https://www.npmjs.com/package/@vitest/browser-playwright)_

#### Layer 3: E2E Tests (Playwright)

**What to test:** Full user flows — creating todos, running Pomodoro sessions, shelving items — with real persistence.

**Configuration:**
- Playwright tests launch the Vite dev server (or preview build)
- Each test gets a fresh browser context (Playwright default) → fresh OPFS
- No special COOP/COEP config needed (`opfs-sahpool` doesn't require it)

**OPFS cleanup between tests:**

```typescript
// playwright fixture
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
    // Clean OPFS after test via page.evaluate
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true });
      }
    });
  },
});
```

_Source: [Playwright - Fast and reliable E2E testing](https://playwright.dev/)_
_Source: [Mock database in Svelte e2e tests (applicable pattern)](https://mainmatter.com/blog/2025/08/21/mock-database-in-svelte-tests/)_

#### Testing Decision Matrix

| Test Type | Tool | Runs In | Tests What | Speed |
|---|---|---|---|---|
| Domain unit tests | Vitest + jsdom | Node.js | Event logic, projections, aggregates | Fast (~ms) |
| Storage integration | Vitest Browser Mode | Chromium | SqliteEventStore + OPFS | Medium (~s) |
| E2E user flows | Playwright | Chromium/FF/WK | Full app with real persistence | Slow (~s) |

### Risk Assessment and Mitigation

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **OPFS not available** (old browser, WebView) | High | Low | Feature-detect OPFS; fall back to `JsonEventStore` (localStorage) |
| **SQLocal is a 0.x library** | Medium | Medium | Minimal API surface used (sql, getDatabaseFile, deleteDatabaseFile); easy to replace with raw sqlite3-wasm if abandoned |
| **localStorage → SQLite migration data loss** | High | Low | Keep localStorage backup for 1 release; validate migrated event count matches |
| **Browser evicts OPFS data** | High | Low | `navigator.storage.persist()` at startup; offer manual export via `getDatabaseFile()` |
| **Multi-tab corruption** | Medium | Medium | SQLocal's reactive mode handles cross-tab reads; single-writer via `navigator.locks` for writes |
| **Vitest Browser Mode adds CI complexity** | Low | Medium | Run browser tests as a separate CI step; cache Playwright browsers |
| **Drizzle browser migration gap** | Low | Low | Not needed initially — raw SQL via SQLocal `sql` templates is sufficient for an event store schema |

### Fallback Strategy: Feature Detection

```typescript
// packages/storage/src/createEventStore.ts
export async function createEventStore(): Promise<EventStore> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      const root = await navigator.storage.getDirectory();
      // OPFS is available — use SQLite
      const store = new SqliteEventStore();
      await store.initialize();
      return store;
    } catch {
      // OPFS not available — fall back
    }
  }
  return new JsonEventStore(); // localStorage fallback
}
```

This preserves the app's functionality on older browsers while progressively enhancing with SQLite + OPFS where available.

## Technical Research Recommendations

### Implementation Roadmap

**Phase 1 — Foundation (1-2 days):**
1. Add `sqlocal` to `@tododoro/storage` dependencies
2. Implement `SqliteEventStore` with `initialize()`, `append()`, `readAll()`, `readByAggregate()`
3. Add `createEventStore()` factory with OPFS feature detection and localStorage fallback
4. Wire into `apps/web` — replace `new JsonEventStore()` with `await createEventStore()`

**Phase 2 — Migration & Persistence (1 day):**
5. Implement one-time localStorage → SQLite migration at startup
6. Add `navigator.storage.persist()` call at app initialization
7. Add database export (download) feature via `getDatabaseFile()` → Blob → download

**Phase 3 — Testing (1-2 days):**
8. Add Vitest Browser Mode config (`vitest.config.browser.ts`) with Playwright provider
9. Write `SqliteEventStore.browser.test.ts` integration tests
10. Add Playwright E2E fixtures with OPFS cleanup

**Phase 4 — Polish (optional, later):**
11. Add Drizzle ORM if/when read model queries become complex
12. Add reactive queries for real-time UI updates (SQLocal `reactiveQuery`)
13. Consider `navigator.locks` for multi-tab write coordination

### Technology Stack Recommendations

| Component | Recommendation | Rationale |
|---|---|---|
| **SQLite wrapper** | SQLocal (not raw wa-sqlite) | Built-in worker orchestration, Mutex, reactive queries, OPFS VFS selection |
| **VFS** | `opfs-sahpool` (SQLocal default) | No COOP/COEP headers needed, good performance, simplest path |
| **ORM** | Skip Drizzle initially | Event store needs only 2-3 tables with raw SQL; add Drizzle later if read models grow complex |
| **Testing** | Vitest Browser Mode (integration) + Playwright (E2E) | Browser APIs required for OPFS; domain tests stay in jsdom |
| **State management** | Zustand (ephemeral) + SQLite (persistent) | Preserve existing Zustand usage for UI state; persistent data moves to SQLite |

### Success Metrics

- **localStorage eliminated** as persistence layer for event data
- **All existing domain tests pass** without modification (EventStore interface contract preserved)
- **SqliteEventStore browser integration tests** cover append, readAll, readByAggregate, migration
- **E2E tests** verify full user flows with real OPFS persistence
- **Data survives browser restart** (verified manually and via E2E)
- **Fallback to localStorage** works when OPFS is unavailable (tested via browser flag or mock)

---

## Research Synthesis

### Executive Summary

SQLite in the browser via OPFS has matured from experimental to production-ready. Notion, PowerSync, and a growing ecosystem of local-first tools have validated this approach at scale. For tododoro specifically, the migration from `localStorage` to SQLite + OPFS is **low-risk and high-reward** due to the existing `EventStore` interface abstraction.

The recommended stack — **SQLocal** wrapping the official `@sqlite.org/sqlite-wasm` build with the **`opfs-sahpool` VFS** — eliminates the historically painful Cross-Origin Isolation header requirement. This means no changes to Vite configuration, no COOP/COEP headers in development or production, and no impact on third-party resource loading. The entire complexity budget goes to the storage layer itself.

Drizzle ORM, while excellent, is **not needed initially**. An event store with 2-3 tables is better served by SQLocal's raw `sql` tagged templates, keeping dependencies minimal. Drizzle becomes valuable if tododoro later adds CRUD read models or complex relational queries.

**Key Technical Findings:**

- SQLocal v0.17.0 provides automatic Web Worker orchestration, built-in Mutex, reactive cross-tab queries, and first-class Drizzle integration — all with zero manual worker code
- `opfs-sahpool` VFS (SQLocal's default) requires **no SharedArrayBuffer and no COOP/COEP headers**, removing the biggest historical adoption blocker
- OPFS has full browser support (Chrome, Safari, Firefox, Edge) and is 3-4x faster than IndexedDB
- Tododoro's `EventStore` interface is the perfect architectural seam — a `SqliteEventStore` drop-in replacement requires zero domain, projection, or React component changes
- Client-side Drizzle migrations remain an unsolved gap; raw SQL migrations via Vite `?raw` imports are the accepted workaround
- Vitest 4.0 Browser Mode (stable) with Playwright provider enables real-browser testing of OPFS-dependent code

**Strategic Recommendations:**

1. **Implement `SqliteEventStore`** as a drop-in replacement for `JsonEventStore` in `@tododoro/storage`
2. **Use SQLocal with `opfs-sahpool`** — skip COOP/COEP entirely
3. **Skip Drizzle initially** — add it later when/if read model complexity warrants it
4. **Feature-detect OPFS** with automatic fallback to `JsonEventStore` for older browsers
5. **Adopt a three-layer testing strategy**: jsdom unit tests (unchanged) + Vitest Browser Mode integration + Playwright E2E

### Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
   - SQLite-on-the-Web Landscape
   - SQLocal (v0.17.0)
   - wa-sqlite
   - Drizzle ORM (Browser/Client-Side)
   - OPFS (Origin Private File System)
   - Vite 7
   - Testing Ecosystem
   - Technology Adoption Trends
3. [Integration Patterns Analysis](#integration-patterns-analysis)
   - Data Flow Architecture: React → Drizzle → SQLocal → OPFS
   - React Integration Pattern
   - Client-Side Migration Strategy
   - Vite Worker Bundling
   - Main Thread ↔ Worker Communication
   - Database Lifecycle & Backup/Restore
   - Cross-Origin Isolation Integration
   - Multi-Tab Concurrency
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
   - System Architecture: Local-First with SQLite as Source of Truth
   - Reactive Query Architecture
   - Data Layer Design Pattern
   - Storage Persistence and Eviction Protection
   - Data Integrity and Error Handling
   - State Management Integration
   - Deployment Architecture
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
   - Current Architecture Analysis
   - Adoption Strategy: SqliteEventStore — Drop-In Replacement
   - Proposed SQLite Schema
   - SqliteEventStore Implementation Sketch
   - Data Migration from localStorage
   - Development Workflow
   - Testing Strategy (Layers 1-3)
   - Risk Assessment and Mitigation
   - Fallback Strategy: Feature Detection
6. [Technical Research Recommendations](#technical-research-recommendations)
   - Implementation Roadmap (4 Phases)
   - Technology Stack Recommendations
   - Success Metrics

### Research Goals Achievement

**Goal 1 — Viability assessment:** **Fully viable.** SQLocal + OPFS is production-ready, validated by Notion and others. The `EventStore` interface provides a clean migration seam. Browser support is universal across modern browsers.

**Goal 2 — Cross-Origin Isolation headers:** **Not required.** SQLocal's default `opfs-sahpool` VFS avoids SharedArrayBuffer entirely, eliminating the COOP/COEP header requirement for both development and production. This was the single most important finding for reducing adoption complexity.

**Goal 3 — Web Worker patterns:** **Fully abstracted by SQLocal.** The developer never writes worker code, manages postMessage, or handles the sync/async bridge. SQLocal spawns its own worker, manages the OPFS VFS, and serializes operations via a built-in Mutex. For custom worker needs, Vite's `new Worker(new URL(...))` pattern and Comlink are available.

**Goal 4 — Testing strategy:** **Three-layer approach defined.** (1) Existing jsdom unit tests for domain logic — unchanged. (2) Vitest 4.0 Browser Mode with Playwright provider for `SqliteEventStore` integration tests against real OPFS. (3) Playwright E2E for full user flows with OPFS cleanup fixtures.

### Future Technical Outlook

**Near-term (2026):**
- SQLocal likely to reach 1.0 as OPFS adoption increases
- Drizzle may add official browser migration support (tracked in GitHub Issue #1009)
- Vitest Browser Mode tooling will mature (traces, debugging, better DX)

**Medium-term (2027+):**
- JSPI (JavaScript Promise Integration) may replace Asyncify in wa-sqlite, yielding smaller Wasm bundles
- OPFS may gain better multi-tab concurrency primitives at the browser level
- Local-first sync frameworks (PowerSync, LiveStore, Electric) may become relevant if tododoro adds multi-device sync

### Source Documentation

All technical claims in this report are verified against current (2025-2026) web sources. Key authoritative sources:

| Source | URL | Used For |
|---|---|---|
| SQLocal Documentation | https://sqlocal.dev | API reference, Drizzle setup, reactive queries |
| SQLocal GitHub Releases | https://github.com/DallasHoff/sqlocal/releases | Version history, feature changes |
| wa-sqlite GitHub | https://github.com/rhashimoto/wa-sqlite | VFS comparison, Asyncify/JSPI |
| SQLite Persistent Storage Options | https://sqlite.org/wasm/doc/trunk/persistence.md | Official VFS documentation |
| PowerSync - SQLite Persistence (Nov 2025) | https://www.powersync.com/blog/sqlite-persistence-on-the-web | Comprehensive state-of-the-art review |
| MDN - Origin Private File System | https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system | OPFS API, browser support |
| MDN - Storage Quotas & Eviction | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Persistence, eviction behavior |
| web.dev - Cross-Origin Isolation | https://web.dev/articles/coop-coep | COOP/COEP header reference |
| Vite 7.0 Announcement | https://vite.dev/blog/announcing-vite7 | Vite 7 features, breaking changes |
| Vitest Browser Mode | https://vitest.dev/guide/browser/ | Browser Mode configuration |
| Vitest 4.0 Release | https://www.infoq.com/news/2025/12/vitest-4-browser-mode/ | Stable Browser Mode, Playwright traces |
| Drizzle ORM GitHub Issue #1009 | https://github.com/drizzle-team/drizzle-orm/issues/1009 | Browser migration gap |
| Drizzle ORM GitHub Discussion #243 | https://github.com/drizzle-team/drizzle-orm/discussions/243 | wa-sqlite integration status |
| Notion - WASM SQLite Blog | https://www.notion.com/blog/how-we-sped-up-notion-in-the-browser-with-wasm-sqlite | Production validation |
| LogRocket - Offline-first 2025 | https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/ | Ecosystem overview |
| Comlink GitHub | https://github.com/GoogleChromeLabs/comlink | Worker communication |
| vite-plugin-cross-origin-isolation | https://www.npmjs.com/package/vite-plugin-cross-origin-isolation | Dev server COOP/COEP |
| coi-serviceworker GitHub | https://github.com/gzuidhof/coi-serviceworker | Static hosting COOP/COEP |

### Research Limitations

- **SQLocal is pre-1.0** (v0.17.0) — API stability is not guaranteed, though the surface area used is minimal
- **No direct benchmarking performed** — performance claims are based on published benchmarks from PowerSync, wa-sqlite discussions, and Notion's blog
- **Multi-tab concurrency** patterns for `opfs-sahpool` are documented but not widely battle-tested in the community
- **Drizzle browser migration support** is tracked but not yet shipped — the workaround (bundled SQL files) is community-validated but unofficial

---

**Technical Research Completion Date:** 2026-03-21
**Research Period:** Comprehensive current technical analysis (2025-2026 sources)
**Source Verification:** All technical facts cited with current web sources
**Technical Confidence Level:** High — based on multiple authoritative technical sources and validated by production deployments (Notion, PowerSync)

_This technical research document serves as the decision basis for adopting SQLocal + OPFS as tododoro's persistence layer, replacing the current localStorage-backed JsonEventStore._
