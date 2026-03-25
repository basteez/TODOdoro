import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'light' | 'system';

const MS_PER_MIN = 60 * 1000;

function clampMs(ms: number, minMinutes: number, maxMinutes: number): number {
  if (!Number.isFinite(ms)) return minMinutes * MS_PER_MIN;
  return Math.max(minMinutes * MS_PER_MIN, Math.min(maxMinutes * MS_PER_MIN, ms));
}

interface SettingsStoreState {
  workDurationMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  theme: ThemePreference;
  setWorkDuration(ms: number): void;
  setShortBreak(ms: number): void;
  setLongBreak(ms: number): void;
  setTheme(theme: ThemePreference): void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      workDurationMs: 25 * MS_PER_MIN,
      shortBreakMs: 5 * MS_PER_MIN,
      longBreakMs: 15 * MS_PER_MIN,
      theme: 'dark' as ThemePreference,
      setWorkDuration(ms: number) {
        set({ workDurationMs: clampMs(ms, 5, 90) });
      },
      setShortBreak(ms: number) {
        set({ shortBreakMs: clampMs(ms, 1, 30) });
      },
      setLongBreak(ms: number) {
        set({ longBreakMs: clampMs(ms, 1, 60) });
      },
      setTheme(theme: ThemePreference) {
        set({ theme });
      },
    }),
    {
      name: 'tododoro-settings',
    },
  ),
);
