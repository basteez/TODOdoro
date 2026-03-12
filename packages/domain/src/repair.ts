import type { DomainEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { Clock, IdGenerator } from './ports.js';

// --- UnknownEvent type for forward compatibility ---

export interface UnknownEvent {
  readonly eventType: string;
  readonly eventId: string;
  readonly aggregateId: string;
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly [key: string]: unknown;
}

// --- Known event types set ---

const KNOWN_EVENT_TYPES = new Set<string>([
  'TodoDeclared',
  'TodoRenamed',
  'TodoPositioned',
  'TodoSealed',
  'TodoReleased',
  'SessionStarted',
  'SessionCompleted',
  'SessionAbandoned',
  'SessionAttributed',
  'SnapshotCreated',
]);

// --- Individual repair functions ---

export function deduplicateByEventId(
  events: ReadonlyArray<DomainEvent>,
): ReadonlyArray<DomainEvent> {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.eventId)) {
      return false;
    }
    seen.add(event.eventId);
    return true;
  });
}

export function upcastEvents(
  events: ReadonlyArray<DomainEvent>,
): ReadonlyArray<DomainEvent> {
  return events.map(upcastEvent);
}

function upcastEvent(event: DomainEvent): DomainEvent {
  // At schemaVersion = 1, no migration needed
  // Future versions add:
  // if (event.schemaVersion === 1) return upcastFrom1To2(event);
  return event;
}

export function skipUnknownEventTypes(
  events: ReadonlyArray<DomainEvent | UnknownEvent>,
): ReadonlyArray<DomainEvent> {
  return events.filter(
    (event): event is DomainEvent => KNOWN_EVENT_TYPES.has(event.eventType),
  );
}

export function autoCloseOrphanedSessions(
  events: ReadonlyArray<DomainEvent>,
  clock: Clock,
  idGenerator: IdGenerator,
): ReadonlyArray<DomainEvent> {
  const closedSessionIds = new Set<string>();
  for (const event of events) {
    if (
      event.eventType === 'SessionCompleted' ||
      event.eventType === 'SessionAbandoned'
    ) {
      closedSessionIds.add(event.aggregateId);
    }
  }

  const synthesized: DomainEvent[] = [];

  for (const event of events) {
    if (
      event.eventType === 'SessionStarted' &&
      !closedSessionIds.has(event.aggregateId)
    ) {
      const elapsed = clock.now() - event.timestamp;
      if (elapsed >= event.configuredDurationMs) {
        synthesized.push({
          eventType: 'SessionCompleted',
          eventId: idGenerator.generate(),
          aggregateId: event.aggregateId,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          timestamp: event.timestamp + event.configuredDurationMs,
          elapsedMs: event.configuredDurationMs,
        });
      }
    }
  }

  return synthesized.length > 0 ? [...events, ...synthesized] : events;
}

// --- Pipeline composer ---

export function repairEvents(
  events: ReadonlyArray<DomainEvent | UnknownEvent>,
  clock: Clock,
  idGenerator: IdGenerator,
): ReadonlyArray<DomainEvent> {
  const step1 = skipUnknownEventTypes(events);
  const step2 = deduplicateByEventId(step1);
  const step3 = upcastEvents(step2);
  const step4 = autoCloseOrphanedSessions(step3, clock, idGenerator);
  return step4;
}
