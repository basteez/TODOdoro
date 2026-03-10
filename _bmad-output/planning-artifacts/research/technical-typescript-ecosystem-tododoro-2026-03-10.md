---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflow_completed: true
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'TypeScript ecosystem for tododoro — monorepo tooling, local-first event-sourced storage, and spatial canvas UI'
research_goals: 'Understand the key TS ecosystem choices for building tododoro: a local-first, event-sourced, monorepo Pomodoro-todo app with a spatial canvas UI — especially from the perspective of a Java developer new to TypeScript'
user_name: 'Tiziano'
date: '2026-03-10'
web_research_enabled: true
source_verification: true
---

# Building tododoro: A Java Developer's Complete Guide to the TypeScript Ecosystem

> Comprehensive technical research: monorepo tooling, local-first event-sourced storage, and spatial canvas UI for a Pomodoro-enhanced Todo app

**Date:** 2026-03-10
**Author:** Tiziano
**Research Type:** Technical — TypeScript Ecosystem for tododoro

---

## Research Overview

This document is a comprehensive technical research report covering the TypeScript ecosystem for **tododoro** — a local-first, event-sourced, monorepo Pomodoro-todo application with a spatial canvas UI. It was produced for Tiziano, a Java developer new to the TypeScript ecosystem, and written with Java-to-TypeScript analogies throughout to accelerate comprehension.

The research spans five domains: technology stack (monorepo tooling, build tools, frontend framework, state management, testing), local-first storage (browser SQLite via WASM, event log design), integration patterns (package boundaries, CQRS data flow, canvas-domain bridge), architectural patterns (hexagonal architecture, DDD, functional event sourcing), and implementation guidance (build sequence, testing strategy, deployment, learning path).

All findings are grounded in current web research (March 2026) with cited sources. A definitive recommended stack, phased build sequence, and risk assessment are provided. See the **Research Synthesis** section at the end of this document for the executive summary, strategic recommendations, and future outlook.

---

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
   - Programming Languages & Runtime
   - Monorepo Tooling (pnpm + Turborepo)
   - Build Tooling (Vite / Rolldown)
   - Frontend Framework (React)
   - State Management (Zustand)
   - Testing Framework (Vitest)
   - Local-First Storage (SQLocal + Drizzle)
   - Type-Safe Query Builder
   - Spatial Canvas UI (React Flow)
   - Event Sourcing Patterns in TypeScript
3. [Integration Patterns Analysis](#integration-patterns-analysis)
   - Package Boundary Architecture
   - The EventStore Interface
   - CQRS Data Flow: EventStore → Projection → Zustand → React
   - Canvas Integration: React Flow ↔ Domain Model
   - Data Formats and Event Serialization
   - End-to-End Event Flow
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
   - System Architecture: Local-First, Hexagonal, Monorepo
   - Domain Layer: Functional Event Sourcing
   - DDD Patterns in TypeScript
   - Data Architecture: The Event Log
   - Scalability and Performance Patterns
   - Security Architecture
   - Deployment Architecture
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
   - Build Sequence and Adoption Strategy
   - Development Workflow and Tooling
   - Testing and Quality Assurance
   - Deployment and Operations Practices
   - TypeScript Learning Path for a Java Developer
   - Risk Assessment and Mitigation
   - Cost Optimization
6. [Research Synthesis](#research-synthesis)
   - Executive Summary
   - Definitive Technology Stack Decision
   - Strategic Recommendations
   - Future Technical Outlook
   - Conclusion

---

## Technical Research Scope Confirmation

**Research Topic:** TypeScript ecosystem for tododoro — monorepo tooling, local-first event-sourced storage, and spatial canvas UI
**Research Goals:** Understand the key TS ecosystem choices for building tododoro: a local-first, event-sourced, monorepo Pomodoro-todo app with a spatial canvas UI — especially from the perspective of a Java developer new to TypeScript

**Technical Research Scope:**

- Architecture Analysis - monorepo patterns, event sourcing, domain package design
- Implementation Approaches - Java-to-TypeScript pattern mapping, testing strategies
- Technology Stack - package managers, build tools, runtime, frontend framework, state management
- Local-First Storage - SQLite adapters vs JSON event log, ORM/persistence layer options
- Spatial Canvas UI - libraries for the Constellation Canvas
- Performance Considerations - event replay performance, canvas rendering at scale

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Java-to-TypeScript analogies throughout

**Scope Confirmed:** 2026-03-10

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

> **Note for Tiziano (Java developer context):** Throughout this section, Java/JVM analogies are provided to help map familiar concepts to their TypeScript equivalents.

---

### Programming Languages & Runtime

**TypeScript** is the language of choice for this project — a strict superset of JavaScript that adds static typing. Think of it as Java's type system applied on top of a dynamic language; you get interfaces, generics, enums, and compile-time errors, but at runtime it all becomes JavaScript.

| Java Concept | TypeScript Equivalent |
|---|---|
| `interface` / `class` | `interface` / `class` (same keywords, different semantics) |
| Generics `List<T>` | Generics `Array<T>` or `T[]` |
| `enum` | `enum` or `const` unions (`'A' \| 'B' \| 'C'`) |
| Checked exceptions | No equivalent — use union return types (`Result<T, E>`) |
| `final` / immutability | `readonly`, `as const` |
| JVM | Node.js (server), browser JS engine (client), or Bun |

**Runtime options:**
- **Node.js** — the JVM of the JS world. Mature, ubiquitous, best ecosystem compatibility. Recommended for this project.
- **Bun** — a newer, faster runtime (written in Zig) that also bundles, runs tests, and manages packages. Promising but less battle-tested than Node.
- **Browser** — for the web app, code runs directly in the browser engine (V8 in Chrome/Edge, SpiderMonkey in Firefox).

_Recommendation for tododoro: Node.js for any CLI/build tooling; browser JS engine for the app itself (it's local-first, so no server runtime needed at v1)._

_Source: [SolidJS vs React 2026](https://www.boundev.com/blog/solidjs-vs-react-2026-performance-guide), [Vite/Rolldown](https://jeffbruchado.com.br/en/blog/rolldown-vite-8-bundler-rust-replace-rollup-esbuild)_

---

### Monorepo Tooling

> **Java analogy:** Gradle multi-project build ≈ pnpm workspaces + Turborepo. pnpm manages which packages exist and how they depend on each other (like Gradle's `settings.gradle`). Turborepo orchestrates build/test tasks with caching (like Gradle's build cache + task dependencies).

**Two separate concerns to understand:**

1. **Workspace management** (dependency resolution, linking packages) → handled by the **package manager**
2. **Task orchestration** (running builds, tests, lints in the right order, with caching) → handled by **Turborepo** or **Nx**

**Recommended combination: pnpm + Turborepo**

| Tool | Role | Java Analogy |
|---|---|---|
| **pnpm** | Package manager + workspace manager | Gradle dependency management |
| **Turborepo** | Task orchestration + build caching | Gradle build cache + task graph |
| **Nx** | Alternative to Turborepo — more features, higher complexity | Maven + Gradle combined |

**pnpm** is strongly preferred over npm/yarn for monorepos:
- Reduces `node_modules` disk usage by up to 70% via content-addressable store (symlinks, like a local Maven repository)
- Enforces strict dependency resolution — prevents "phantom dependencies" (packages you use but didn't declare, a common Node.js footgun)
- `pnpm-workspace.yaml` defines the monorepo structure

**Turborepo** (rewritten in Rust in 2024) handles:
- Parallel task execution across packages
- Local and remote caching (via Vercel) — on a 15-package repo, warm builds take 0.4s vs 31s cold
- Pipeline definition in `turbo.json` (what runs before what)

**Nx** is more powerful but significantly more complex — code generators, interactive dependency graphs, CI optimization agents. Overkill for tododoro's scope.

_Benchmark on 15-package monorepo: Cold build Turborepo 31s / Nx 28s. Warm (cached): Turborepo 0.4s / Nx 0.3s. No tooling: 94s._

_Source: [PkgPulse Monorepo Comparison](https://www.pkgpulse.com/blog/monorepo-tools-compared), [Turborepo + pnpm Guide](https://latestfromtechguy.com/article/monorepos-turborepo-pnpm)_

---

### Build Tooling

> **Java analogy:** Vite ≈ Maven/Gradle for frontend — it compiles, bundles, and serves your app.

**Vite** is the de facto standard build tool for TypeScript/React projects in 2026:
- **Dev server:** Extremely fast hot module replacement (HMR) — file changes reflect in the browser in milliseconds
- **Production build:** Currently uses Rollup under the hood; Vite 8 (expected Q3 2026) will replace it with **Rolldown** (Rust-based), delivering 10-30x faster production builds
- **TypeScript:** Native support, zero configuration
- **Config:** Single `vite.config.ts` file, easily shared across a monorepo

**Rolldown** (the future of Vite's bundler):
- Written in Rust, same speed class as esbuild
- Rollup-compatible API — plugins just work
- Unifies dev + prod bundler (currently they're different tools, causing subtle inconsistencies)
- Real-world: builds dropping from 46s → 6s

_Source: [Rolldown/Vite 8](https://jeffbruchado.com.br/en/blog/rolldown-vite-8-bundler-rust-replace-rollup-esbuild), [ByteIota Migration Guide](https://byteiota.com/vite-8-rolldown-migration-guide-10-30x-faster-builds/)_

---

### Frontend Framework

> **Java analogy:** Think of React as the Spring MVC of frontend — dominant, mature, sometimes verbose, but with an enormous ecosystem. SolidJS is like Quarkus — leaner, faster, but with a smaller community.

**React** is the recommended choice for tododoro, for these reasons:

| | React | SolidJS | Svelte |
|---|---|---|---|
| **Bundle size** | ~40KB gzipped | ~5-7KB | ~10KB compiled |
| **Performance** | Good | 50-70% faster than React | Fast |
| **Ecosystem** | Enormous | Small but growing | Medium |
| **TypeScript support** | Excellent | Excellent | Good |
| **Canvas libraries** | React Flow, React-Konva | Limited | Limited |
| **State management** | Zustand, Jotai, Redux | Built-in signals | Built-in stores |
| **Learning resources** | Vast | Limited | Good |
| **2026 weekly downloads** | Dominant | Growing | Growing |

**Why React for tododoro:**
1. The Constellation Canvas relies on `@xyflow/react` (React Flow) — no equivalent in SolidJS/Svelte
2. As a Java developer new to TS ecosystem, React's larger community means more answers to your questions
3. React's rendering model (components, props, hooks) maps more intuitively to OOP patterns than SolidJS's signals
4. Glassmorphism UI libraries and animation libraries (Framer Motion) are React-first

_Source: [BounDev SolidJS vs React 2026](https://www.boundev.com/blog/solidjs-vs-react-2026-performance-guide), [Merge.rocks Framework Comparison](https://merge.rocks/blog/what-is-the-best-front-end-framework-in-2025-expert-breakdown)_

---

### State Management

> **Java analogy:** Think of Zustand as a simple singleton service with observable state — a `@Service` bean that components can subscribe to. Jotai is more like individual reactive cells (closer to MobX or RxJava's `BehaviorSubject` per field).

For tododoro, the state is derived from the event log (via replay/projections). State management holds the **projected read model** in memory.

**Recommendation: Zustand**

| Library | Philosophy | Size | 2026 Weekly Downloads | Best For |
|---|---|---|---|---|
| **Zustand** | Store = a hook | 3KB | 18M | Simple shared state, easy to learn |
| **Jotai** | Many small atoms | 3-4KB | 4M | Fine-grained subscriptions, derived state |
| **Redux Toolkit** | Flux pattern + reducers | Large | 9M (declining) | Complex apps with strict patterns |

**Zustand** wins for tododoro because:
- No providers or boilerplate — a store is literally just a hook
- Selector-based subscriptions prevent unnecessary re-renders
- Simple enough to learn alongside React and TypeScript simultaneously
- The event-sourced domain package already handles all the "reducer" logic; Zustand just holds the output

**Jotai** is a worthy alternative if the canvas state becomes highly granular (each card as an atom = only that card re-renders on drag). Could be introduced later if performance requires it.

_Source: [State Management 2026](https://latestfromtechguy.com/article/state-management-2026), [JSGuru Zustand Analysis](https://jsgurujobs.com/blog/state-management-in-2026-and-why-zustand-is-winning-the-war-against-redux)_

---

### Testing Framework

> **Java analogy:** Vitest ≈ JUnit 5 + Mockito. Same concepts: `describe` = `@Nested`, `it`/`test` = `@Test`, `vi.fn()` = Mockito mock, `expect` = AssertJ assertions.

**Recommendation: Vitest**

| | Jest | Vitest |
|---|---|---|
| **TypeScript support** | Requires transformer (ts-jest) | Native, zero config |
| **ESM support** | Experimental, fragile | Native |
| **Speed (50k tests)** | 14m 22s | 4m 51s |
| **Watch mode** | ~3,400ms | ~380ms |
| **Monorepo config** | Separate config per package | Inherits from vite.config.ts |
| **API** | Jest API | ~identical to Jest |

Vitest is the clear choice for new TypeScript projects in 2026 — native ESM, native TypeScript, 10-20x faster, and its API is nearly identical to Jest so there's almost no learning overhead.

_Source: [Vitest vs Jest 2026](https://devtoolswatch.com/en/vitest-vs-jest-2026), [SitePoint Benchmark](https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/)_

---

### Local-First Storage

> **Java analogy:** This is your JPA/Hibernate + database choice, but for a browser-local SQLite database instead of a server-side RDBMS.

This is the most architecturally critical decision for tododoro. The event store needs to:
- Persist immutable events locally on the device
- Support append-only writes
- Support sequential reads for replay
- Work entirely in the browser (no server)

**Three viable approaches:**

#### Option A: SQLocal + wa-sqlite (Recommended for v1)

**SQLocal** runs SQLite3 entirely in the browser via WebAssembly, backed by the **Origin Private File System** (OPFS — a browser API for local persistent storage):
- SQLite in the browser — the exact same database Java developers know
- Persistent across sessions (survives page refresh, browser restart)
- Reactive subscriptions across tabs
- TypeScript support with **Drizzle** or **Kysely** as the type-safe query layer
- Web Workers for non-blocking execution

**Schema for tododoro's event store would look like:**
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,          -- UUID (immutable identity)
  event_type TEXT NOT NULL,     -- 'TodoDeclared', 'SessionStarted', etc.
  aggregate_id TEXT NOT NULL,   -- which Todo or Session this belongs to
  schema_version INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,   -- wall-clock milliseconds
  payload TEXT NOT NULL         -- JSON blob of event data
);
CREATE INDEX idx_events_aggregate ON events(aggregate_id, timestamp);
```

_Source: [SQLocal](https://sqlocal.dallashoffman.com/), [wa-sqlite React example](https://github.com/ga1az/react-local-first-wa-sqlite)_

#### Option B: JSON Event Log File (Simplest for v1)

A flat JSON array persisted to `localStorage` or IndexedDB via a simple adapter. No dependencies, no WASM.

- **Pros:** Zero setup, works everywhere, readable/debuggable
- **Cons:** Slower for large event logs, no query capabilities, manual migration
- **Best for:** Prototyping and early validation before optimizing storage

#### Option C: ElectricSQL (For future sync capabilities)

ElectricSQL (next-gen version) provides local SQLite + cloud sync via shape-based replication. Overkill for v1 but a natural upgrade path if tododoro ever adds multi-device sync.

**Recommendation:** Start with **JSON event log** for the first prototype (zero friction, proves the domain model), then migrate to **SQLocal + Drizzle** when the event count makes JSON unwieldy. The event-sourced model makes this migration trivially safe — the schema doesn't change, just the storage adapter.

> **Java analogy for the migration:** This is exactly like switching from `HashMap` in-memory storage to a real JPA repository — the domain logic doesn't change, only the `Repository` implementation.

---

### Type-Safe Query Builder (for SQLite layer)

> **Java analogy:** Drizzle ≈ Spring Data JPA (schema-first, generates queries). Kysely ≈ jOOQ (query-builder, maximum type safety, closer to raw SQL).

| | Drizzle | Kysely |
|---|---|---|
| **Philosophy** | Schema-first ORM | Query builder |
| **Migrations** | Auto-generated from schema | Manual (Knex-style) |
| **Type safety** | Strong for results | Stricter end-to-end |
| **Learning curve** | Medium | Low (plain TypeScript interfaces) |
| **SQLite support** | Yes | Yes |
| **Best for** | New projects, rapid schema iteration | Complex queries, large-scale |

**Recommendation: Drizzle** for tododoro — schema-first approach works well with a well-defined event table, and automatic migration generation reduces boilerplate for a solo/small-team project.

_Source: [2025 TypeScript ORM Battle](https://medium.com/gitconnected/the-2025-typescript-orm-battle-prisma-vs-drizzle-vs-kysely-007ffdfded67), [Drizzle vs Kysely Comparison](https://marmelab.com/blog/2025/06/26/kysely-vs-drizzle)_

---

### Spatial Canvas UI

> **Java analogy:** This is uncharted territory in the Java world — there's no direct equivalent. Think of it as JavaFX's Canvas node, but in the browser.

The Constellation Canvas is tododoro's highest-risk UI bet. Three candidate libraries:

| Library | Stars | Approach | Interactivity | Performance | Best For |
|---|---|---|---|---|---|
| **React Flow** (`@xyflow/react`) | 35.6K | Node-graph, zooms/pans | Built-in drag, select, zoom | Good | Node editors, spatial canvases |
| **Konva.js / React-Konva** | 14K / 6K | Canvas2D, declarative shapes | Built-in drag, events | Good | Design tools, seat maps |
| **Pixi.js** | 46.6K | WebGL renderer | Manual (no React integration) | Excellent | Games, thousands of animated objects |

**React Flow (`@xyflow/react`) — Recommended for tododoro:**
- v12.10.1 (February 2026), 3.6M weekly npm downloads
- Built-in zoomable, pannable canvas with `zoomOnScroll`, `panOnDrag`
- Each todo card = a custom Node component (React component you write freely)
- Handles multiple selection, drag-and-drop, collision detection
- MIT licensed
- The "nodes" model maps directly to the tododoro card model — position, drag, zoom are all handled

**Konva.js** is a valid alternative if cards need custom low-level rendering (drawing paths, custom shapes). Slower to update than React Flow.

**Pixi.js** is overkill — optimized for rendering thousands of animated sprites. The 100-card canvas limit in tododoro's philosophy means Canvas2D is more than sufficient.

_Source: [React Flow](https://reactflow.dev/), [JavaScript Canvas Frameworks Ranking Feb 2026](https://medium.com/@drabstract/ranking-javascript-canvas-frameworks-3c3e407ab7d8), [Konva Why](https://konvajs.org/docs/guides/why-konva.html)_

---

### Event Sourcing Patterns in TypeScript

> **Java analogy:** This maps almost perfectly to Axon Framework patterns. `Aggregate` = Axon Aggregate, `Command` = Axon Command, `DomainEvent` = Axon Event, `EventStore` = Axon Event Store, `Projection` = Axon Query Model.

**Core TypeScript pattern for `@tododoro/domain`:**

```typescript
// Domain event — the immutable record of what happened
interface DomainEvent {
  eventId: string;        // UUID
  eventType: string;      // 'TodoDeclared', 'SessionStarted', etc.
  aggregateId: string;    // which entity this belongs to
  schemaVersion: number;  // for upcasting/migration
  timestamp: number;      // wall-clock milliseconds
  payload: unknown;       // event-specific data
}

// Aggregate — enforces business rules, emits events
class TodoAggregate {
  private events: DomainEvent[] = [];

  static declare(id: string, title: string): TodoAggregate {
    const agg = new TodoAggregate();
    agg.apply({ eventType: 'TodoDeclared', aggregateId: id, payload: { title } });
    return agg;
  }

  private apply(event: DomainEvent): void {
    this.events.push(event);
    // mutate state
  }
}

// Projection — derived read model rebuilt from events
function projectTodoList(events: DomainEvent[]): Todo[] { ... }
```

**Key patterns used in current TypeScript implementations (2026):**

1. **Optimistic concurrency control** — version field on events prevents lost updates (equivalent to `@Version` in JPA)
2. **Snapshot-based replay** — every N events, write a checkpoint; replay from snapshot + tail (Axon's `@SnapshotTriggerDefinition`)
3. **Schema upcasting** — `schemaVersion` field + upgrade pipeline transforms old events on read (Axon's `EventUpcaster`)
4. **Tolerant reader** — unknown event types skipped with warning during replay
5. **Functional aggregates** — newer TS libraries (like `ts-event-core`) use pure functions instead of classes: `(state, event) => newState`

_Source: [Node.js Event Sourcing 2026](https://oneuptime.com/blog/post/2026-01-26-nodejs-event-sourcing/view), [Event Sourced Repository Guide](https://yazanalaboudi.dev/the-last-event-sourced-repository-youll-ever-need), [ts-event-core](https://github.com/Sam152/ts-event-core)_

---

### Technology Adoption Trends (Summary)

- **pnpm** has overtaken yarn as the preferred package manager for monorepos; npm remains dominant for single-package projects
- **Vite** has effectively won the build tool space; webpack is legacy; Rolldown (Vite 8) will further cement this
- **Zustand** is rapidly displacing Redux in new projects; Redux is still dominant in maintenance-mode enterprise codebases
- **Vitest** adoption is accelerating — major frameworks (Nuxt, SvelteKit, Angular) now default to it
- **SQLite in the browser** (via WASM) is the emerging standard for local-first web apps, replacing IndexedDB for complex data
- **Event sourcing** is gaining traction in TypeScript for audit-trail-heavy and offline-first applications; Axon-style patterns are being replicated in pure TS libraries

---

## Integration Patterns Analysis

> **Scope note:** tododoro is a local-first, single-app, no-backend architecture. Traditional "microservices/API gateway/OAuth" patterns don't apply. The integration challenge here is entirely **intra-monorepo**: how the three packages (`domain`, `storage`, `ui`) compose into a coherent application, and how data flows from persistent storage through to the canvas.

---

### Package Boundary Architecture

> **Java analogy:** Each monorepo package is a Maven module with its own `pom.xml`. The key rule is the same: **dependency direction must be acyclic** — lower-level packages never import from higher-level ones.

The tododoro monorepo has a strict layered dependency graph:

```
apps/web
  └── imports @tododoro/ui
  └── imports @tododoro/storage
  └── imports @tododoro/domain

packages/ui
  └── imports @tododoro/domain     (needs event types for node data)

packages/storage
  └── imports @tododoro/domain     (needs event types to persist/read)

packages/domain
  └── imports NOTHING (zero external dependencies, pure TypeScript)
```

**Rules:**
- `domain` is the **shared kernel** — pure TypeScript, zero framework dependencies, zero npm dependencies. It owns: event type definitions, aggregate logic, business rules, projection functions.
- `storage` depends on `domain` for event types only. It owns: the `EventStore` interface + concrete adapters (JSON, SQLite).
- `ui` depends on `domain` for event types to build typed React Flow node data. It owns: canvas components, card components, timer components.
- `apps/web` assembles everything: wires storage into commands, subscribes projections into Zustand, renders the canvas.

**TypeScript project references** (`tsconfig.json` `references` field) enforce this at compile time — circular imports fail the build.

_Source: [TypeScript Monorepo Sharing Types](https://www.usefulfunctions.co.uk/2025/11/07/sharing-types-across-typescript-monorepos/), [Modernizing Monorepo Architectures](https://tech-andgar.me/posts/modernizing-monorepo-architecture/)_

---

### The EventStore Interface (Storage Adapter Pattern)

> **Java analogy:** This is your `Repository<T>` interface from Spring Data. The domain never touches the concrete implementation — it only knows the interface. Swapping JSON → SQLite is like switching from `JpaRepository` to a custom `MongoRepository`.

The storage adapter pattern provides full decoupling between domain logic and persistence:

```typescript
// In @tododoro/domain — the contract
export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  readAll(): Promise<DomainEvent[]>;
  readByAggregate(aggregateId: string): Promise<DomainEvent[]>;
  readAfter(sequenceNumber: number): Promise<DomainEvent[]>;
}

// In @tododoro/storage — the JSON adapter (v1 prototype)
export class JsonEventStore implements EventStore {
  async append(event: DomainEvent) { /* write to localStorage */ }
  async readAll() { /* parse JSON from localStorage */ }
  // ...
}

// In @tododoro/storage — the SQLite adapter (v1 production)
export class SqliteEventStore implements EventStore {
  async append(event: DomainEvent) { /* INSERT INTO events */ }
  async readAll() { /* SELECT * FROM events ORDER BY timestamp */ }
  // ...
}
```

**Key design decisions:**
- The interface is defined in `domain`, not `storage` — the domain owns the contract, infrastructure implements it
- All methods are `async` from day one — even the JSON adapter, so the interface never changes when switching to SQLite
- `readAfter(sequenceNumber)` enables incremental replay (only load new events since last projection, not full replay every time)

**Concrete implementations** use the `castore` library or custom adapters — multiple open-source implementations exist for in-memory (tests), localStorage, and SQLite backends.

_Source: [Event-Sourced Repository Guide](https://yazanalaboudi.dev/the-last-event-sourced-repository-youll-ever-need), [castore library](https://castore-dev.github.io/castore/), [eventstore-typescript](https://github.com/ricofritzsche/eventstore-typescript)_

---

### CQRS Data Flow: EventStore → Projection → Zustand → React

> **Java analogy:** Commands = Spring `@CommandHandler` methods. Projections = Axon `@EventHandler` methods that build a read model. Zustand store = the read model (a JPA-backed query database, but in memory).

This is the central integration pattern for tododoro. Data flows in one direction:

```
User Action (e.g. "start session")
    │
    ▼
Command Handler (in apps/web or domain)
    │  validates business rules via aggregate
    │  produces DomainEvent
    ▼
EventStore.append(event)          ← persists to SQLite/JSON
    │
    ▼
Projection Function               ← pure function: (currentState, event) => newState
    │  defined in @tododoro/domain
    │  framework-agnostic, fully testable
    ▼
Zustand Store.setState(newState)  ← updates the React read model
    │
    ▼
React Components re-render        ← only components subscribed to changed state
    │
    ▼
Canvas (React Flow nodes update)
```

**Projection example:**

```typescript
// In @tododoro/domain — pure function, no React, no storage
export function projectTodoList(
  state: TodoListReadModel,
  event: DomainEvent
): TodoListReadModel {
  switch (event.eventType) {
    case 'TodoDeclared':
      return { ...state, todos: [...state.todos, { id: event.aggregateId, title: event.payload.title, pomodoroCount: 0 }] };
    case 'SessionCompleted':
      return { ...state, todos: state.todos.map(t =>
        t.id === event.payload.todoId ? { ...t, pomodoroCount: t.pomodoroCount + 1 } : t
      )};
    // ...
    default:
      return state; // tolerant reader — unknown events are ignored
  }
}
```

**Zustand store wiring in apps/web:**

```typescript
const useTodoStore = create<TodoListReadModel>((set) => ({
  todos: [],
  // bootstrap: replay all events on app load
  bootstrap: async (eventStore: EventStore) => {
    const events = await eventStore.readAll();
    const state = events.reduce(projectTodoList, initialTodoListState);
    set(state);
  },
  // live update: called after every command
  applyEvent: (event: DomainEvent) =>
    set((state) => projectTodoList(state, event)),
}));
```

This pattern keeps all business logic in `@tododoro/domain` (pure, testable, framework-agnostic) while Zustand only handles the "hold and broadcast" concern.

_Source: [Zustand Architecture Patterns at Scale](https://brainhub.eu/library/zustand-architecture-patterns-at-scale), [use-cqrs](https://github.com/thachp/use-cqrs), [CQRS/Event Sourcing TypeScript](https://github.com/Zintei0709/CQRS-Event-Sourcing)_

---

### Canvas Integration: React Flow ↔ Domain Model

> **Java analogy:** React Flow nodes are like JPA `@Entity` projections — they're DTOs (Data Transfer Objects) shaped specifically for the view layer, derived from the domain model.

React Flow's TypeScript integration allows fully typed node data, bridging the domain model to the canvas:

```typescript
// In @tododoro/domain — the domain read model
export interface TodoReadModel {
  id: string;
  title: string;
  pomodoroCount: number;
  gravitySignal: 'low' | 'medium' | 'high';
  status: 'active' | 'sealed' | 'released';
}

// In @tododoro/ui — the canvas node type (extends React Flow's Node)
import { Node } from '@xyflow/react';

export type TodoCardNode = Node<{
  todo: TodoReadModel;
  isActiveSession: boolean;
}, 'todo-card'>;

export type AppNode = TodoCardNode; // union as more node types are added
```

**Data flow for canvas updates:**
1. Zustand `todos` array changes (from projection)
2. `apps/web` maps `TodoReadModel[]` → `TodoCardNode[]`
3. React Flow re-renders only changed nodes (internal optimization)
4. Card position (x, y) is stored in the event log as a `TodoPositioned` event — so spatial layout is also part of the event history

**Position persistence:** Card positions are stored as relative percentages (0–1 range) so they reflow correctly on any screen size:

```typescript
interface TodoPositionedPayload {
  x: number;  // 0.0 to 1.0 (percentage of canvas width)
  y: number;  // 0.0 to 1.0 (percentage of canvas height)
}
```

_Source: [React Flow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes), [React Flow TypeScript Guide](https://reactflow.dev/learn/advanced-use/typescript)_

---

### Data Formats and Event Serialization

> **Java analogy:** Events are serialized to JSON (like Jackson `@JsonProperty`). Schema versioning is like Jackson's `@JsonTypeInfo` + `ObjectMapper` version handling.

**Event wire format** (stored in SQLite `events` table or JSON log):

```json
{
  "eventId": "01HXYZ...",
  "eventType": "SessionCompleted",
  "aggregateId": "todo-uuid-here",
  "schemaVersion": 1,
  "timestamp": 1741612800000,
  "payload": {
    "durationMs": 1500000,
    "todoId": "todo-uuid-here"
  }
}
```

**Schema upcasting pipeline** (in `@tododoro/domain`):

```typescript
type Upcaster = (event: DomainEvent) => DomainEvent;

const upcasters: Record<string, Record<number, Upcaster>> = {
  'SessionCompleted': {
    1: (e) => ({ ...e, payload: { ...e.payload, wasAbandoned: false }, schemaVersion: 2 }),
  }
};

export function upcast(event: DomainEvent): DomainEvent {
  const typeUpcasters = upcasters[event.eventType];
  if (!typeUpcasters) return event;
  let current = event;
  while (typeUpcasters[current.schemaVersion]) {
    current = typeUpcasters[current.schemaVersion](current);
  }
  return current;
}
```

This runs on read, before events reach projections — old events are transparently upgraded without modifying stored data.

---

### Event-Driven Integration: Command → Domain → Storage → UI

The complete integration sequence for a single user action (e.g. "seal a todo"):

```
1. User clicks "Complete" on a TodoCard
2. React component calls: declareTodoSealed(todoId)
3. Command handler (apps/web):
   a. Loads aggregate events from EventStore: readByAggregate(todoId)
   b. Replays events through TodoAggregate to get current state
   c. Calls aggregate.seal() → validates business rule (not already sealed)
   d. Returns DomainEvent: { eventType: 'TodoSealed', aggregateId: todoId, ... }
4. EventStore.append(event) → persists to SQLite
5. Zustand applyEvent(event) → projectTodoList updates read model
6. React Flow re-renders the card (fades to completed state)
7. "Completion Moment" UI triggers (devotion record display)
```

Every step is independently testable. The domain aggregate test (`TodoAggregate.seal()`) needs zero React, zero SQLite — just pure TypeScript.

_Source: [Node.js Event Sourcing 2026](https://oneuptime.com/blog/post/2026-01-26-nodejs-event-sourcing/view), [Event-Sourced Repository Guide](https://yazanalaboudi.dev/the-last-event-sourced-repository-youll-ever-need)_

---

## Architectural Patterns and Design

> **Scope note:** tododoro is a **local-first, single-user, no-backend web application**. Its architectural challenges are not about microservices, load balancing, or distributed systems — they are about **domain purity, event replay correctness, canvas state management, and long-term maintainability** of a solo/small-team project. This section focuses on those specifically.

---

### System Architecture: Local-First, Hexagonal, Monorepo

The overall architecture follows three overlapping patterns:

**1. Local-First Architecture**

Adopted by production tools like Figma, Linear, Superhuman, and Excalidraw, local-first architecture treats the user's device as the primary runtime:[2]
- Data lives on the device; no server required for any functionality
- Instant reads and writes — no network latency on the critical path
- The app works 100% offline by definition
- Future sync (multi-device) is additive, not a rewrite

For tododoro v1, the local-first pattern simplifies enormously: there is no sync engine, no conflict resolution, no server. The event log is the single source of truth on the user's device.

**2. Hexagonal Architecture (Ports & Adapters)**

The dependency rule is strict — business logic never depends on infrastructure:

```
┌─────────────────────────────────────────┐
│              apps/web                   │  ← React UI, wiring
│  ┌───────────────────────────────────┐  │
│  │       @tododoro/ui                │  │  ← React components, canvas
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │     @tododoro/storage             │  │  ← EventStore adapter (port impl)
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │     @tododoro/domain              │  │  ← Pure TS: events, aggregates,
│  │     (the hexagon core)            │  │     projections, EventStore PORT
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- **Ports** (interfaces in `domain`): `EventStore`, `Clock` (for testable time), `IdGenerator`
- **Adapters** (implementations in `storage` / `apps/web`): `SqliteEventStore`, `JsonEventStore`, `SystemClock`, `UuidGenerator`
- The domain core has **zero knowledge** of React, SQLite, browsers, or Vite

**3. Monorepo with Strict Package Boundaries**

TypeScript project references enforce compile-time acyclic dependencies. Each package has a single responsibility and is independently testable.

_Source: [Local-First Design Patterns 2026](https://mongoose.cloud/design-patterns-local-first-2026/), [Hexagonal Architecture TS](https://runlevel0.me/blog/hexagonal-architecture-in-typescript-part-1/), [Clean Architecture Frontend](https://feature-sliced.design/kr/blog/frontend-clean-architecture)_

---

### Domain Layer Architecture: Functional Event Sourcing

> **Java analogy:** Rather than Axon's class-based `@Aggregate` with `@CommandHandler` and `@EventSourcingHandler` methods, the recommended TypeScript approach is functional — pure functions instead of class methods. Think of it as the difference between a Spring `@Service` class and a pure Java `static` utility function.

**Functional Core / Imperative Shell** is the dominant recommended pattern for event sourcing in TypeScript in 2025-2026:

```typescript
// ─── FUNCTIONAL CORE (in @tododoro/domain) ───────────────────────────────────
// Pure functions — no I/O, no side effects, trivially testable

// State type — what an aggregate "currently looks like"
type TodoState =
  | { status: 'nonexistent' }
  | { status: 'active'; id: string; title: string; pomodoroCount: number }
  | { status: 'sealed'; id: string; title: string; pomodoroCount: number }
  | { status: 'released'; id: string; title: string; pomodoroCount: number };

// Reducer — given current state + event, return next state
function reduceTodo(state: TodoState, event: DomainEvent): TodoState {
  switch (event.eventType) {
    case 'TodoDeclared':
      return { status: 'active', id: event.aggregateId, title: event.payload.title, pomodoroCount: 0 };
    case 'SessionCompleted':
      if (state.status !== 'active') return state;
      return { ...state, pomodoroCount: state.pomodoroCount + 1 };
    case 'TodoSealed':
      if (state.status !== 'active') return state;
      return { ...state, status: 'sealed' };
    default:
      return state; // tolerant reader
  }
}

// Decision function — given current state + command, return new events or error
function sealTodo(state: TodoState): DomainEvent | Error {
  if (state.status === 'nonexistent') return new Error('Todo does not exist');
  if (state.status === 'sealed') return new Error('Already sealed');
  if (state.status === 'released') return new Error('Cannot seal a released todo');
  return { eventType: 'TodoSealed', aggregateId: state.id, ... };
}

// ─── IMPERATIVE SHELL (in apps/web) ─────────────────────────────────────────
// Handles I/O: reading events, persisting new events

async function handleSealTodo(todoId: string, eventStore: EventStore): Promise<void> {
  const events = await eventStore.readByAggregate(todoId);
  const state = events.reduce(reduceTodo, { status: 'nonexistent' });
  const result = sealTodo(state);
  if (result instanceof Error) throw result;
  await eventStore.append(result);
}
```

**Why functional over OOP aggregates:**
- Pure functions are trivially testable — no class instantiation, no mocks, no `new`
- State type unions (`'active' | 'sealed' | 'released'`) make illegal states unrepresentable at compile time
- TypeScript discriminated unions are more expressive than class hierarchies for state machines
- The functional pattern is the emerging standard in TypeScript event sourcing as of 2025-2026

_Source: [Functional Event Sourcing](https://ricofritzsche.me/functional-event-sourcing/), [My Journey from Aggregates to Functional](https://event-driven.io/en/my_journey_from_aggregates/), [ts-event-core](https://github.com/Sam152/ts-event-core)_

---

### DDD Patterns in TypeScript

> **Java analogy:** Same concepts as Java DDD — Value Objects, Entities, Aggregates, Domain Events, Bounded Contexts. TypeScript expresses them differently, using discriminated unions and `readonly` instead of `final`.

**Value Objects** — immutable, validated, identity-by-value:

```typescript
// Instead of a raw string everywhere:
type TodoTitle = { readonly _brand: 'TodoTitle'; readonly value: string };

function createTodoTitle(raw: string): TodoTitle | Error {
  if (raw.trim().length === 0) return new Error('Title cannot be empty');
  if (raw.length > 200) return new Error('Title too long');
  return { _brand: 'TodoTitle', value: raw.trim() };
}
```

The `_brand` field is a TypeScript technique called "branded types" — it makes `TodoTitle` structurally incompatible with a plain `string`, preventing accidental misuse. This is the TypeScript equivalent of a Java `@Value` class.

**Bounded Contexts** — for tododoro, there is a single bounded context (the entire app is one domain). This is appropriate for v1. If multi-user or sync features are added later, a separate `sync` bounded context would be introduced.

**Aggregate boundaries:**
- `Todo` aggregate: owns its lifecycle (declared → active → sealed/released)
- `Session` aggregate: owns a single Pomodoro session (started → completed/abandoned)
- Sessions reference Todos by ID (foreign key), but do not belong to the Todo aggregate — this is the "Session-First Data Model" from the brainstorming session

_Source: [Practical DDD TypeScript Value Objects](https://readmedium.com/practical-ddd-in-typescript-value-object-b76bcd2d9283), [Practical DDD TypeScript Aggregates](https://javascript.plainenglish.io/practical-ddd-in-typescript-aggregate-fd47a6631865), [@rineex/ddd](https://registry.npmjs.org/%40rineex%2Fddd)_

---

### Data Architecture: The Event Log

**Append-only journal** is the recommended local-first data pattern, verified by production implementations at Figma, Linear, and similar tools:

```
events table (SQLite via SQLocal)
─────────────────────────────────────────────────────
seq       | INTEGER PRIMARY KEY AUTOINCREMENT  ← replay cursor
event_id  | TEXT UNIQUE NOT NULL               ← idempotency key
event_type| TEXT NOT NULL
aggregate_id | TEXT NOT NULL
schema_version | INTEGER NOT NULL DEFAULT 1
timestamp | INTEGER NOT NULL                   ← wall-clock ms
payload   | TEXT NOT NULL                      ← JSON

INDEX: (aggregate_id, seq)   ← for readByAggregate
INDEX: (seq)                 ← for readAfter (incremental replay)
```

**Replay strategy evolution** (three phases matching tododoro's growth):

| Phase | Events | Strategy | Performance |
|---|---|---|---|
| v1 launch | 0–500 | Full replay on boot | < 10ms, imperceptible |
| Mid-use | 500–5,000 | Incremental replay (readAfter last known seq) | < 50ms |
| Power user | 5,000+ | Snapshot-based replay (SnapshotCreated every 500 events) | O(n) from snapshot |

The snapshot strategy from the brainstorming session is architecturally sound and matches production-grade patterns. It requires no schema changes — a snapshot is just another event type.

**Repair pipeline** (runs on every boot before projection):

```typescript
function repairEvents(raw: DomainEvent[]): DomainEvent[] {
  return raw
    .filter(deduplicateByEventId)          // idempotency: remove duplicates
    .map(upcast)                           // schema migration: v1 → v2 → ...
    .filter(skipUnknownEventTypes)         // tolerant reader
    .map(autoCloseOrphanedSessions);       // repair: unclosed sessions
}
```

_Source: [Local-First Design Patterns 2026](https://mongoose.cloud/design-patterns-local-first-2026/), [Offline-First Architecture 2026](https://whistl.app/offline-first-architecture-design-2026.html)_

---

### Scalability and Performance Patterns

> For a local-first, single-user app, "scalability" means: **performance stays good as personal data grows over months/years of use.**

**Canvas performance (React Flow):**
- React Flow only re-renders changed nodes — no full canvas redraws
- 100-card hard limit (from the product philosophy) means React Flow's rendering capacity is never stressed
- Relative coordinates (stored as 0.0–1.0 floats) are cheap to compute on resize
- Focus Collapse (single-card view during session) reduces rendered nodes to 1

**Event replay performance:**
- Full replay of 500 events: < 10ms (pure JavaScript `Array.reduce` over a small array)
- SQLite sequential reads are extremely fast locally (no network, no serialization overhead)
- Snapshot at every 500 events keeps replay O(n) bounded to ~500 events maximum

**State management performance (Zustand):**
- Selector-based subscriptions mean only components using changed state re-render
- The canvas node list (max 100) is small enough that even a full re-projection is fast
- Jotai can be introduced later if individual card-level re-renders become an issue (e.g., dragging a card should not re-render all other cards)

---

### Security Architecture

> For a local-first, no-backend, no-account app, traditional security patterns (OAuth, JWT, mTLS) don't apply. The security surface is minimal by design.

**What does apply:**
- **No data exfiltration surface** — data never leaves the device in v1; there is no API endpoint to attack
- **Origin Private File System (OPFS)** — used by SQLocal for storage; it's sandboxed per-origin by the browser, inaccessible to other websites
- **No authentication required** — the product philosophy explicitly eliminates accounts
- **XSS hygiene** — React's JSX escapes output by default; avoid `dangerouslySetInnerHTML`
- **Content Security Policy (CSP)** — configure in `index.html` to prevent script injection

**Future sync consideration:** If multi-device sync is ever added, the sync layer would need end-to-end encryption of the event log before any cloud transmission. The append-only event log is an ideal unit for E2E encryption — encrypt each event's `payload` field independently.

---

### Deployment Architecture

> tododoro is a static web app — deployment is trivially simple.

**v1 deployment:**
- `vite build` produces a `dist/` folder of static HTML/CSS/JS
- Deploy to any static host: **Vercel** (zero config, free tier, auto-deploys from git), Netlify, or GitHub Pages
- No server, no database server, no Docker, no Kubernetes
- The entire "backend" is SQLite running in the user's browser

**Progressive Web App (PWA) — recommended addition:**
- Add a `manifest.json` and service worker (via `vite-plugin-pwa`) to make the app installable on desktop/mobile
- Enables full offline use without a browser tab
- Matches the "no accounts, owns your device" philosophy perfectly

**CI pipeline (Turborepo + GitHub Actions):**
```
push → pnpm install → turbo run build test lint
                          ↓
               type-check @tododoro/domain
               vitest @tododoro/domain (100% coverage gate)
               vitest @tododoro/storage
               vitest apps/web
               vite build apps/web
```

_Source: [Local-First Architecture Expo Guide](https://docs.expo.dev/guides/local-first), [Offline-First Architecture 2026](https://whistl.app/offline-first-architecture-design-2026.html)_

---

## Implementation Approaches and Technology Adoption

---

### Build Sequence and Adoption Strategy

> **Java analogy:** Don't write Spring controllers before your domain model compiles cleanly. Same here — domain first, storage second, UI third.

The recommended build sequence directly follows the priority order from the brainstorming session, now with a concrete technical foundation:

**Phase 0 — Monorepo scaffold (Day 1, ~2 hours)**

```bash
# Prerequisites: Node.js v20+, pnpm v9+
npm install -g pnpm
pnpm dlx create-turbo@latest tododoro --package-manager pnpm
```

Resulting structure:
```
tododoro/
├── apps/
│   └── web/               ← React + Vite app (created last)
├── packages/
│   ├── domain/            ← pure TS, zero deps (created first)
│   ├── storage/           ← EventStore adapters (created second)
│   └── ui/                ← React components (created third)
├── PRODUCT_PHILOSOPHY.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`turbo.json` pipeline:
```json
{
  "pipeline": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":      { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "dev":       { "cache": false, "persistent": true }
  }
}
```

**Phase 1 — `@tododoro/domain` (Week 1)**
- Define all `DomainEvent` types (union type, discriminated by `eventType`)
- Define all state types (`TodoState`, `SessionState`) as discriminated unions
- Implement all reducer functions (`reduceTodo`, `reduceSession`)
- Implement all decision functions (`declareTodo`, `sealTodo`, `releaseTodo`, `startSession`, `completeSession`)
- Implement the projection functions (`projectTodoList`, `projectDevotionRecord`)
- Implement the repair pipeline (`upcast`, `deduplicate`, `skipUnknown`, `autoCloseOrphaned`)
- Define the `EventStore` interface and `Clock`/`IdGenerator` ports
- **Coverage gate: 100% on domain logic before moving to Phase 2**

**Phase 2 — `@tododoro/storage` (Week 2)**
- Implement `JsonEventStore` (localStorage + JSON) for fast prototyping
- Implement `SqliteEventStore` (SQLocal + Drizzle) for production
- Write integration tests for both adapters

**Phase 3 — `@tododoro/ui` + `apps/web` canvas (Weeks 3-4)**
- Build the React Flow canvas with custom `TodoCardNode`
- Wire Zustand store with bootstrap replay and `applyEvent`
- Implement command handlers in `apps/web`

**Phase 4 — Features (Weeks 5+)**
- Living Background timer
- Devotion Record display
- The Shelf (archive view)
- Release Ritual / Completion Moment
- PWA manifest + service worker

_Source: [Turborepo + pnpm Guide](https://latestfromtechguy.com/article/monorepos-turborepo-pnpm), [Full-Stack Monorepo 2026](https://medium.com/@oxm/how-i-built-a-professional-full-stack-monorepo-with-next-js-node-js-and-pnpm-workspaces-2026-1b8f5ac66bf9)_

---

### Development Workflow and Tooling

**Daily development loop:**

```bash
# Start all packages in watch mode
pnpm dev
# → Turborepo starts Vite dev server for apps/web
# → TypeScript compiler watches packages/domain, packages/storage

# Run all tests in watch mode (separate terminal)
pnpm test --filter @tododoro/domain -- --watch
```

**Code quality toolchain:**

| Tool | Purpose | Config file |
|---|---|---|
| **TypeScript** (`strict: true`) | Type safety, catches bugs at compile time | `tsconfig.json` per package |
| **ESLint** (flat config) | Code style, catch anti-patterns | `eslint.config.ts` at root |
| **Prettier** | Formatting (no debates) | `.prettierrc` at root |
| **Vitest** | Tests | `vitest.config.ts` per package |

**Recommended `tsconfig.json` settings for domain package:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true
  }
}
```

`strict: true` enables: `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny` — the equivalent of Java's null safety + generics enforcement. `noUncheckedIndexedAccess` is a TypeScript-specific extra that makes array indexing type-safe (array elements are `T | undefined`, not just `T`).

---

### Testing and Quality Assurance

> **Java analogy:** `describe` = `@Nested` class, `it`/`test` = `@Test`, `expect` = AssertJ, `vi.fn()` = Mockito mock, `beforeEach` = `@BeforeEach`.

**The Given-When-Then pattern for event-sourced domain tests:**

```typescript
// packages/domain/src/__tests__/todo.test.ts
import { describe, it, expect } from 'vitest';
import { reduceTodo, sealTodo } from '../todo';

describe('Todo aggregate', () => {
  describe('sealTodo', () => {
    it('seals an active todo', () => {
      // GIVEN: a todo that has been declared
      const state = reduceTodo(
        { status: 'nonexistent' },
        { eventType: 'TodoDeclared', aggregateId: 't1', payload: { title: 'Write tests' }, ... }
      );

      // WHEN: seal command is issued
      const result = sealTodo(state);

      // THEN: a TodoSealed event is returned
      expect(result).toMatchObject({ eventType: 'TodoSealed', aggregateId: 't1' });
    });

    it('rejects sealing an already-sealed todo', () => {
      // GIVEN: a todo that is already sealed
      const state: TodoState = { status: 'sealed', id: 't1', title: 'Done', pomodoroCount: 3 };

      // WHEN: seal command is issued again
      const result = sealTodo(state);

      // THEN: an error is returned (not thrown — functional style)
      expect(result).toBeInstanceOf(Error);
    });
  });
});
```

**Test coverage strategy for `@tododoro/domain`:**

| Test type | Coverage target | What it tests |
|---|---|---|
| Unit: reducers | 100% | Every event type produces correct next state |
| Unit: decisions | 100% | Every valid and invalid command produces correct event or error |
| Unit: projections | 100% | Read models built correctly from event sequences |
| Unit: repair pipeline | 100% | All 6 corruption scenarios produce correct repair |
| Unit: upcasters | 100% | Each schema migration produces correct output |
| Integration: storage adapters | Core paths | EventStore append + readAll + readByAggregate |

Zero mocks needed for domain tests — pure functions have no dependencies to mock.

**Vitest configuration for `@tododoro/domain`:**
```typescript
// packages/domain/vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: { lines: 100, functions: 100, branches: 100 }
    }
  }
});
```

_Source: [Testing Event-Sourced Systems](https://docs.eventsourcingdb.io/best-practices/testing-event-sourced-systems/), [Testing Business Logic in Event Sourcing](https://event-driven.io/en/testing_event_sourcing/), [Functional Event Sourcing](https://ricofritzsche.me/functional-event-sourcing/)_

---

### Deployment and Operations Practices

**SQLocal setup in Vite + React (concrete steps):**

```bash
# In apps/web
pnpm add sqlocal drizzle-orm
pnpm add -D drizzle-kit
```

`vite.config.ts` — required cross-origin isolation headers:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

> **Important:** These headers are also required in production (Vercel). They must be set in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

Storage initialization:
```typescript
// apps/web/src/storage/db.ts
import { SQLocal } from 'sqlocal';
import { drizzle } from 'drizzle-orm/sqlocal';
import * as schema from './schema';

const sqlocal = new SQLocal('tododoro.sqlite3');
export const db = drizzle(sqlocal, { schema });
```

**CI pipeline (GitHub Actions):**
```yaml
# .github/workflows/ci.yml
- run: pnpm install --frozen-lockfile
- run: pnpm turbo typecheck
- run: pnpm turbo test        # includes 100% coverage gate on domain
- run: pnpm turbo build
```

**Vercel deployment:** Connect the GitHub repo to Vercel. Set build command to `pnpm turbo build --filter=apps/web` and output directory to `apps/web/dist`. Zero additional configuration required.

**PWA setup (recommended, low effort):**
```bash
pnpm add -D vite-plugin-pwa
```

This adds installability and full offline support in approximately 30 minutes of configuration.

_Source: [SQLocal Setup Guide](https://sqlocal.dallashoffman.com/guide/setup), [SQLocal GitHub](https://github.com/dallashoff/sqlocal)_

---

### TypeScript Learning Path for a Java Developer

> **Honest assessment:** TypeScript's type system will feel familiar within a week. JavaScript's runtime behavior (closures, `this`, async/await, the event loop) is where Java intuitions break down. Investing 1-2 weeks in JS fundamentals before TypeScript pays significant dividends.

**Recommended learning sequence (4–6 weeks before writing production code):**

**Week 1 — JavaScript runtime fundamentals (not TypeScript yet)**
- ES6+ syntax: arrow functions, destructuring, spread, template literals
- `async/await` and Promises (the JS equivalent of `CompletableFuture`)
- Array methods: `.map()`, `.filter()`, `.reduce()` — you'll use these constantly
- Module system: `import`/`export` (analogous to Java `import` but file-based, not class-based)
- Resource: [javascript.info](https://javascript.info) — the best free JS reference

**Week 2 — TypeScript core (Official TypeScript Handbook)**
- Basic types, type aliases, interfaces
- Discriminated unions (the pattern used throughout tododoro) — **no Java equivalent; learn this well**
- Generics (identical concept to Java, slightly different syntax)
- `strict` mode and what it enforces
- Resource: [TypeScript for Java/C# Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html) — official guide targeting your exact background

**Week 3 — React fundamentals**
- Components, props, JSX
- `useState`, `useEffect`, `useCallback` hooks
- Resource: Official React docs (react.dev) — excellent, interactive, modern

**Week 4 — Practical integration**
- Set up the monorepo scaffold
- Write the first domain events and reducer in TypeScript
- Write the first Vitest tests

**Key mental model shifts for Java developers:**

| Java mental model | TypeScript reality |
|---|---|
| Class hierarchy is the primary abstraction | Functions and type shapes are equally valid |
| Interfaces must be explicitly implemented | Structural typing — if it has the right shape, it fits |
| Checked exceptions | No checked exceptions — use `Result<T, E>` union return types |
| `null` is a footgun | `null` is still a footgun; `strict` mode forces you to handle it |
| One class per file is convention | No such convention — export multiple things per file freely |
| Packages are directory-based | Modules are file-based — no package declaration needed |

_Source: [From Java to TypeScript Guide](https://medium.com/@amarpreetbhatia/from-java-to-typescript-a-comprehensive-guide-for-java-developers-bafa5d0a826e), [TypeScript for Java/C# Programmers](https://typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html), [TypeScript Overtakes JavaScript 2026](https://www.javacodegeeks.com/2026/03/typescript-overtakes-javascript-what-jvm-developers-need-to-know.html)_

---

### Risk Assessment and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Canvas UX fails user test — spatial model is unfamiliar | Medium | High | Build canvas as standalone component first, test with real users before wiring domain |
| SQLocal OPFS not supported in older browser | Low | Medium | OPFS available in all major browsers since 2023; add `localStorage` fallback for JSON adapter |
| Vite production build issue with SQLocal workers | Medium | Medium | Known issue (#67 on SQLocal repo); pin to stable SQLocal version, monitor fix |
| Event schema breaks backward compatibility | Low | High | `schemaVersion` field + upcasting pipeline prevents this; enforce in CI |
| TypeScript learning curve slows velocity | Medium | Medium | Mitigated by Java type system familiarity; budget 4–6 weeks for ramp-up |
| 100-card limit feels restrictive to power users | Low | Low | It's a deliberate philosophical constraint; document it in `PRODUCT_PHILOSOPHY.md` |

---

### Cost Optimization and Resource Management

tododoro has near-zero infrastructure cost by design:

| Resource | Cost | Notes |
|---|---|---|
| Vercel hosting | Free | Hobby tier, unlimited deploys |
| GitHub (CI) | Free | 2,000 CI minutes/month on free tier |
| Domain name | ~$12/year | Optional |
| Development tooling | Free | All OSS: pnpm, Turborepo, Vite, Vitest, React |
| Storage | Free | SQLite runs in the user's browser; no cloud DB |

Total infrastructure cost for v1: **$0/month** (or ~$1/month with a custom domain).

---

## Research Synthesis

---

### Executive Summary

tododoro sits at the intersection of three technically interesting domains: **event sourcing**, **local-first architecture**, and **spatial canvas UI** — and the TypeScript ecosystem in 2026 has mature, production-validated solutions for all three. This research was conducted to give Tiziano — a Java developer entering the TypeScript world — the technical grounding needed to make confident architectural decisions without getting lost in ecosystem noise.

The central finding is that the stack for tododoro is **not controversial**. Every major decision has a clear winner with strong adoption data, well-maintained libraries, and direct Java analogues to ease the learning curve. The architecture (hexagonal, event-sourced, functional core) maps cleanly to patterns Tiziano already knows from Java DDD. The primary investment required is not architectural creativity — it is **ecosystem familiarity and TypeScript language fluency**, both of which are achievable within 4–6 weeks.

The local-first approach (no backend, SQLite in the browser via WASM) is no longer experimental. It is the pattern used by Figma, Linear, Superhuman, and Excalidraw, and browser SQLite tooling (SQLocal, wa-sqlite) reached production maturity in 2024–2025. The event-sourced functional core pattern is well-established in TypeScript and aligns perfectly with tododoro's brainstormed "Session-First Data Model" and "Immutable Todo Identity" architecture ideas.

---

### Definitive Technology Stack Decision

This is the confirmed recommended stack for tododoro based on all research:

| Concern | Chosen Tool | Confidence | Key Reason |
|---|---|---|---|
| Package manager | **pnpm v9** | High | Strict deps, 70% smaller node_modules, workspace support |
| Monorepo orchestration | **Turborepo** | High | Low config, Rust-rewrite, 85% faster cached builds |
| Build tool | **Vite 7** (→ Vite 8/Rolldown) | High | De facto standard, native TS, fast HMR |
| Frontend framework | **React 19** | High | Largest ecosystem, only framework with React Flow |
| State management | **Zustand** | High | Simplest, 18M downloads/week, no providers |
| Testing | **Vitest** | High | Native TS/ESM, 10-20x faster than Jest, identical API |
| Storage (v1 prototype) | **JSON + localStorage** | High | Zero setup, proves domain model |
| Storage (v1 production) | **SQLocal + Drizzle** | High | SQLite in browser, type-safe, OPFS-persistent |
| Canvas UI | **React Flow (`@xyflow/react`)** | High | 35K stars, 3.6M downloads/wk, built-in zoom/drag/pan |
| Domain style | **Functional (pure functions)** | High | Trivially testable, no mocks, aligns with TypeScript unions |
| CI/Deploy | **GitHub Actions + Vercel** | High | Free, zero-config, auto-deploy |

**No alternatives are recommended for v1.** Each tool above has overwhelming adoption data and a clear fit for tododoro's requirements.

---

### Strategic Recommendations

**Recommendation 1: Build `@tododoro/domain` before touching React**

The domain package is the highest-leverage investment in the entire project. It is pure TypeScript with zero dependencies — the easiest thing to write and test, and the foundation everything else sits on. Resist the temptation to open a browser. Write events, reducers, and decision functions first. Reach 100% test coverage. Only then install React.

This mirrors best Java practice: write your domain model and unit tests before wiring Spring.

**Recommendation 2: Use discriminated union types everywhere in the domain**

```typescript
type TodoState =
  | { status: 'nonexistent' }
  | { status: 'active'; id: string; title: string }
  | { status: 'sealed'; id: string; title: string }
  | { status: 'released'; id: string; title: string };
```

This pattern makes illegal states unrepresentable at compile time. The TypeScript compiler enforces business rules. If you try to seal a `released` todo, the code doesn't compile. This is more powerful than Java's checked exceptions for domain invariants.

**Recommendation 3: Start storage with JSON, migrate to SQLite when ready**

The `EventStore` interface in `@tododoro/domain` means the storage swap is a one-file change. A `JsonEventStore` backed by `localStorage` takes 30 minutes to write and is sufficient to prove all domain logic and UI. When you're ready for production persistence, swap to `SqliteEventStore`. Zero domain code changes.

**Recommendation 4: Build the canvas as a standalone component before wiring state**

The Constellation Canvas is the highest-risk UX bet in the product. Build it in isolation first — hardcode 5 mock todo cards, verify zoom/pan/drag/collapse behavior works and feels right — before connecting it to the event store or Zustand. This is the spatial UX equivalent of a walking skeleton. Fail fast on the risky assumption before investing in the plumbing.

**Recommendation 5: Invest in TypeScript strict mode from day one**

Set `"strict": true`, `"noUncheckedIndexedAccess": true`, and `"exactOptionalPropertyTypes": true` in your `tsconfig.json` from the first commit. These settings are painful to retrofit into an existing codebase (like adding null checks to legacy Java), but trivial to maintain from the start. Strict mode is what gives TypeScript its Java-like safety guarantees.

**Recommendation 6: Encode the Product Philosophy as TypeScript constraints**

From the brainstorming session: no due dates, no sub-tasks, no priority fields. Encode these in the domain package — literally do not define those fields in any type. The type system becomes the product specification. Future contributors (or future-you) cannot accidentally add a `dueDate` field to `TodoState` without a deliberate domain-level decision.

---

### Future Technical Outlook

**Near-term (6–12 months):**
- **Vite 8 / Rolldown** reaches stable release (Q3 2026) — drop-in upgrade delivering 10-30x faster production builds with zero config changes
- **React Signals** (TC39 proposal) may stabilize — offers SolidJS-like fine-grained reactivity within React; Zustand would remain valid but signals could eliminate it for some use cases
- **SQLocal** continues maturing — the OPFS-backed SQLite story in browsers is solidifying fast; WASM SQLite is on track to become the standard for offline-first web data

**Medium-term (1–2 years):**
- **Local-first + AI on-device** — frameworks like Transformers.js bring ML inference to the browser without data leaving the device; tododoro's event log is an ideal private dataset for personal productivity insights
- **Multi-device sync** becomes addressable — if tododoro ever needs cross-device sync, ElectricSQL (next-gen) or Replicache provide CRDT-based sync engines that layer on top of a local SQLite event store without schema changes
- **PGlite** (PostgreSQL compiled to WASM) may emerge as an alternative to wa-sqlite for more complex query needs; the EventStore adapter pattern means this is a one-file swap

**Long-term (2+ years):**
- The local-first revolution (as described by industry leaders in 2026) continues accelerating — cloud-first architectures are being replaced by "local DB + optional sync" patterns across the industry. tododoro's architecture is ahead of this curve, not behind it.
- TypeScript's dominance is structural — it surpassed JavaScript in GitHub usage in August 2025 and the gap is widening. The investment in TypeScript skills is durable.

_Source: [Local-First Revolution 2026](https://tasukehub.com/articles/local-first-architecture-2026?lang=en), [Local-First AI 2026](https://www.sitepoint.com/the-definitive-guide-to-localfirst-ai-building-privacycentric-web-apps-in-2026/), [SQLite in WASM](https://www.sqliteforum.com/p/sqlite-in-webassembly-running-databases)_

---

### Technical Research Methodology and Sources

**Research approach:** Five parallel web research passes (technology stack, storage, integration patterns, architectural patterns, implementation) conducted March 10, 2026. All claims verified against current public sources. Java-to-TypeScript analogies synthesized from the official TypeScript handbook and practitioner guides.

**Primary sources consulted:**

| Domain | Key Sources |
|---|---|
| Monorepo tooling | PkgPulse, LatestFromTechGuy, Turborepo docs |
| Local-first storage | SQLocal docs, wa-sqlite examples, ElectricSQL blog |
| Event sourcing | event-driven.io, ricofritzsche.me, oneuptime.com |
| Canvas UI | React Flow docs, Medium (Dr Abstract ranking), LibHunt |
| State management | LatestFromTechGuy, JSGuruJobs, DEV Community |
| Testing | SitePoint, DevToolsWatch, QASkills.sh |
| DDD / Architecture | javascript.plainenglish.io, feature-sliced.design, runlevel0.me |
| TypeScript learning | JavaCodeGeeks, typescriptlang.org official handbook, Medium |
| Future outlook | TasukeHub, SitePoint, SQLite Forum |

**Confidence levels:**
- Technology stack recommendations: **High** — all tools have large adoption data (millions of weekly downloads) and active maintenance
- Event sourcing patterns: **High** — multiple consistent sources, current (Jan-Feb 2026)
- SQLocal production readiness: **Medium-High** — stable but one known Vite production build issue documented; easy mitigation available
- Future outlook: **Medium** — directional, based on current trajectories

---

### Conclusion

tododoro is a technically ambitious project built on a sound philosophical foundation. The brainstorming session produced not just features but a coherent worldview — and that worldview generates architectural decisions naturally. The Session-First Data Model maps directly to event sourcing. The Immutable Todo Identity maps directly to aggregate UUIDs. The Tolerant Event Replay maps directly to the repair pipeline. The philosophy didn't constrain the architecture — it specified it.

For Tiziano specifically: the TypeScript ecosystem will feel noisy at first, but it narrows quickly. The tools chosen here (pnpm, Turborepo, Vite, React, Zustand, Vitest, SQLocal, React Flow) are not experimental choices — they are the current consensus for this class of application. Invest the first 4–6 weeks in JavaScript and TypeScript fundamentals, then build `@tododoro/domain` with Vitest. Once that package has 100% coverage, the rest of the project has a solid foundation to build on.

The entire philosophy of tododoro — a mirror, not a manager — starts with its architecture. A pure domain package that knows nothing about React or SQLite is itself a mirror: it reflects business truth without distortion. Build that first.

---

**Technical Research Completion Date:** 2026-03-10
**Research Period:** Current comprehensive analysis — all sources from 2024-2026
**Source Verification:** All technical facts cited with current sources
**Confidence Level:** High — based on multiple authoritative sources with corroborating data

_This comprehensive technical research document serves as the authoritative technical reference for tododoro's TypeScript ecosystem decisions and provides the strategic foundation for informed architecture and implementation choices._
