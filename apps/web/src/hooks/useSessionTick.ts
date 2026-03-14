import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/useSessionStore.js';

export function useSessionTick() {
  const status = useSessionStore((s) => s.activeSession.status);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (status !== 'active') return;

    function tick() {
      useSessionStore.getState().tick();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [status]);
}
