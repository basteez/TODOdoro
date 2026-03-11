import { create } from 'zustand';
import type { ActiveSessionReadModel } from '@tododoro/domain';
import { INITIAL_ACTIVE_SESSION_STATE } from '@tododoro/domain';

interface SessionStoreState {
  activeSession: ActiveSessionReadModel;
  bootstrap(session: ActiveSessionReadModel): void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  activeSession: INITIAL_ACTIVE_SESSION_STATE,
  bootstrap(session) {
    set({ activeSession: session });
  },
}));
