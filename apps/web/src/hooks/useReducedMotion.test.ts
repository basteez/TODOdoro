import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let matchMediaMatches = false;
let matchMediaListeners: Array<(e: { matches: boolean }) => void> = [];

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matchMediaMatches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
      matchMediaListeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
      matchMediaListeners = matchMediaListeners.filter((h) => h !== handler);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('useReducedMotion', () => {
  beforeEach(async () => {
    matchMediaMatches = false;
    matchMediaListeners = [];
    vi.resetModules();
  });

  async function getHook() {
    const mod = await import('./useReducedMotion.js');
    return mod.useReducedMotion;
  }

  it('returns false when OS does not prefer reduced motion', async () => {
    matchMediaMatches = false;
    const useReducedMotion = await getHook();
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when OS prefers reduced motion', async () => {
    matchMediaMatches = true;
    const useReducedMotion = await getHook();
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when OS preference changes', async () => {
    matchMediaMatches = false;
    const useReducedMotion = await getHook();
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true });
      }
    });
    expect(result.current).toBe(true);
  });

  it('registers a change listener on matchMedia', async () => {
    const useReducedMotion = await getHook();
    renderHook(() => useReducedMotion());
    expect(matchMediaListeners.length).toBeGreaterThan(0);
  });
});
