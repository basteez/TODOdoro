import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the store
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useSettingsStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
  });

  async function getStore() {
    const mod = await import('./useSettingsStore.js');
    return mod.useSettingsStore;
  }

  it('has correct default values', async () => {
    const useSettingsStore = await getStore();
    const state = useSettingsStore.getState();

    expect(state.workDurationMs).toBe(25 * 60 * 1000);
    expect(state.shortBreakMs).toBe(5 * 60 * 1000);
    expect(state.longBreakMs).toBe(15 * 60 * 1000);
  });

  it('setWorkDuration updates workDurationMs', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setWorkDuration(30 * 60 * 1000);

    expect(useSettingsStore.getState().workDurationMs).toBe(30 * 60 * 1000);
  });

  it('setShortBreak updates shortBreakMs', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setShortBreak(10 * 60 * 1000);

    expect(useSettingsStore.getState().shortBreakMs).toBe(10 * 60 * 1000);
  });

  it('setLongBreak updates longBreakMs', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setLongBreak(20 * 60 * 1000);

    expect(useSettingsStore.getState().longBreakMs).toBe(20 * 60 * 1000);
  });

  it('persists settings to localStorage', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setWorkDuration(45 * 60 * 1000);

    // Zustand persist middleware writes to localStorage
    const stored = localStorageMock.getItem('tododoro-settings');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.workDurationMs).toBe(45 * 60 * 1000);
  });

  it('has default theme of dark', async () => {
    const useSettingsStore = await getStore();
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setTheme updates theme', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');

    useSettingsStore.getState().setTheme('system');
    expect(useSettingsStore.getState().theme).toBe('system');
  });

  it('persists theme to localStorage', async () => {
    const useSettingsStore = await getStore();
    useSettingsStore.getState().setTheme('light');

    const stored = localStorageMock.getItem('tododoro-settings');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.theme).toBe('light');
  });

  it('restores theme from localStorage on rehydration', async () => {
    localStorageMock.setItem(
      'tododoro-settings',
      JSON.stringify({
        state: { workDurationMs: 25 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 15 * 60 * 1000, theme: 'system' },
        version: 0,
      }),
    );

    const useSettingsStore = await getStore();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useSettingsStore.getState().theme).toBe('system');
  });

  it('restores settings from localStorage on rehydration', async () => {
    // Pre-seed localStorage
    localStorageMock.setItem(
      'tododoro-settings',
      JSON.stringify({
        state: {
          workDurationMs: 50 * 60 * 1000,
          shortBreakMs: 8 * 60 * 1000,
          longBreakMs: 20 * 60 * 1000,
        },
        version: 0,
      }),
    );

    const useSettingsStore = await getStore();

    // Wait for rehydration
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = useSettingsStore.getState();
    expect(state.workDurationMs).toBe(50 * 60 * 1000);
    expect(state.shortBreakMs).toBe(8 * 60 * 1000);
    expect(state.longBreakMs).toBe(20 * 60 * 1000);
  });
});
