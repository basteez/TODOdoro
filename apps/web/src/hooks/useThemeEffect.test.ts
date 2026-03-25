import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock localStorage before importing the store
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock matchMedia
let matchMediaListeners: Array<(e: { matches: boolean }) => void> = [];
let matchMediaMatches = false;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes('prefers-color-scheme: light') ? matchMediaMatches : false,
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

describe('useThemeEffect', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    matchMediaListeners = [];
    matchMediaMatches = false;
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  async function setup(theme: 'dark' | 'light' | 'system') {
    const { useSettingsStore } = await import('../stores/useSettingsStore.js');
    const { useThemeEffect } = await import('./useThemeEffect.js');
    useSettingsStore.getState().setTheme(theme);
    return { useSettingsStore, useThemeEffect };
  }

  it('sets data-theme="light" when theme is light', async () => {
    const { useThemeEffect } = await setup('light');
    renderHook(() => useThemeEffect());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes data-theme when theme is dark', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const { useThemeEffect } = await setup('dark');
    renderHook(() => useThemeEffect());
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('applies light when system prefers light', async () => {
    matchMediaMatches = true;
    const { useThemeEffect } = await setup('system');
    renderHook(() => useThemeEffect());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies dark when system prefers dark', async () => {
    matchMediaMatches = false;
    const { useThemeEffect } = await setup('system');
    renderHook(() => useThemeEffect());
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('registers matchMedia listener in system mode', async () => {
    const { useThemeEffect } = await setup('system');
    renderHook(() => useThemeEffect());
    expect(matchMediaListeners.length).toBeGreaterThan(0);
  });
});
