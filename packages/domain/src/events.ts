// Base fields present on every event:
//   eventType: string literal — discriminant for the DomainEvent union
//   eventId: string — unique identifier for this event instance
//   aggregateId: string — the aggregate this event belongs to
//   schemaVersion: number — for future migration support
//   timestamp: number — milliseconds since epoch (Unix ms)

import type { TodoListReadModel } from './projections/todoList.js';
import type { ShelfReadModel } from './projections/shelf.js';
import type { DevotionRecordReadModel } from './projections/devotionRecord.js';
import type { ActiveSessionReadModel } from './projections/activeSession.js';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const SNAPSHOT_THRESHOLD = 500 as const;

export interface SnapshotState {
  readonly todoList: TodoListReadModel;
  readonly shelf: ShelfReadModel;
  readonly devotionRecord: DevotionRecordReadModel;
  readonly activeSession: ActiveSessionReadModel;
}

export interface TodoDeclaredEvent {
  readonly eventType: 'TodoDeclared';
  readonly eventId: string;
  readonly aggregateId: string; // todoId
  readonly schemaVersion: number;
  readonly timestamp: number; // ms since epoch
  readonly title: string;
}

export interface TodoRenamedEvent {
  readonly eventType: 'TodoRenamed';
  readonly eventId: string;
  readonly aggregateId: string; // todoId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly title: string; // new title
}

export interface TodoPositionedEvent {
  readonly eventType: 'TodoPositioned';
  readonly eventId: string;
  readonly aggregateId: string; // todoId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly x: number;
  readonly y: number;
}

export interface TodoSealedEvent {
  readonly eventType: 'TodoSealed';
  readonly eventId: string;
  readonly aggregateId: string; // todoId
  readonly schemaVersion: number;
  readonly timestamp: number;
}

export interface TodoReleasedEvent {
  readonly eventType: 'TodoReleased';
  readonly eventId: string;
  readonly aggregateId: string; // todoId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly releaseReason: 'completed_its_purpose' | 'was_never_truly_mine';
}

export interface SessionStartedEvent {
  readonly eventType: 'SessionStarted';
  readonly eventId: string;
  readonly aggregateId: string; // sessionId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly todoId: string | null; // null = Exploration session
  readonly configuredDurationMs: number;
}

export interface SessionCompletedEvent {
  readonly eventType: 'SessionCompleted';
  readonly eventId: string;
  readonly aggregateId: string; // sessionId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly elapsedMs: number;
}

export interface SessionAbandonedEvent {
  readonly eventType: 'SessionAbandoned';
  readonly eventId: string;
  readonly aggregateId: string; // sessionId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly elapsedMs: number; // will be < 60000 (60s threshold)
}

export interface SessionAttributedEvent {
  readonly eventType: 'SessionAttributed';
  readonly eventId: string;
  readonly aggregateId: string; // sessionId
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly todoId: string; // the todo to attribute the session to
}

export interface SnapshotCreatedEvent {
  readonly eventType: 'SnapshotCreated';
  readonly eventId: string;
  readonly aggregateId: string; // 'system'
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly snapshotState: SnapshotState;
}

export type DomainEvent =
  | TodoDeclaredEvent
  | TodoRenamedEvent
  | TodoPositionedEvent
  | TodoSealedEvent
  | TodoReleasedEvent
  | SessionStartedEvent
  | SessionCompletedEvent
  | SessionAbandonedEvent
  | SessionAttributedEvent
  | SnapshotCreatedEvent;
