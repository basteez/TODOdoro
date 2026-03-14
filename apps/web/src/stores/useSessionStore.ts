import { create } from 'zustand';
import type { ActiveSessionReadModel } from '@tododoro/domain';
import { INITIAL_ACTIVE_SESSION_STATE } from '@tododoro/domain';

interface SessionStoreState {
  activeSession: ActiveSessionReadModel;
  elapsedMs: number;
  bootstrap(session: ActiveSessionReadModel): void;
  startSession(session: ActiveSessionReadModel): void;
  tick(): void;
  endSession(): void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  activeSession: INITIAL_ACTIVE_SESSION_STATE,
  elapsedMs: 0,
  bootstrap(session) {
    set({ activeSession: session, elapsedMs: 0 });
  },
  startSession(session) {
    set({ activeSession: session, elapsedMs: 0 });
  },
  tick() {
    const { activeSession } = get();
    if (activeSession.status !== 'active') return;
    const elapsed = Date.now() - activeSession.startedAt;
    set({ elapsedMs: elapsed });
  },
  endSession() {
    set({ activeSession: INITIAL_ACTIVE_SESSION_STATE, elapsedMs: 0 });
  },
}));
