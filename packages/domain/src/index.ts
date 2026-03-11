export { CURRENT_SCHEMA_VERSION } from './events.js';

export type {
  DomainEvent,
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoPositionedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
  SnapshotCreatedEvent,
} from './events.js';

export type {
  EventStore,
  Clock,
  IdGenerator,
} from './ports.js';

export type { TodoState } from './todo.js';
export {
  INITIAL_TODO_STATE,
  reduceTodo,
  declareTodo,
  renameTodo,
  positionTodo,
  sealTodo,
  releaseTodo,
} from './todo.js';

export type { SessionState } from './session.js';
export {
  reduceSession,
  startSession,
  completeSession,
  abandonSession,
  INITIAL_SESSION_STATE,
} from './session.js';

// Repair pipeline
export type { UnknownEvent } from './repair.js';
export {
  repairEvents,
  deduplicateByEventId,
  upcastEvents,
  skipUnknownEventTypes,
  autoCloseOrphanedSessions,
} from './repair.js';

// Projections
export type { TodoListItem, TodoListReadModel, TodoListView } from './projections/todoList.js';
export { INITIAL_TODO_LIST_STATE, projectTodoList } from './projections/todoList.js';

export type { DevotionSession, DevotionRecord, DevotionRecordReadModel, DevotionRecordView } from './projections/devotionRecord.js';
export { INITIAL_DEVOTION_RECORD_STATE, projectDevotionRecord } from './projections/devotionRecord.js';

export type { ShelfItem, ShelfReadModel, ShelfView } from './projections/shelf.js';
export { INITIAL_SHELF_STATE, projectShelf } from './projections/shelf.js';

export type { ActiveSessionReadModel } from './projections/activeSession.js';
export { INITIAL_ACTIVE_SESSION_STATE, projectActiveSession } from './projections/activeSession.js';
