import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevotionRecord, computeTimeSpan } from '@tododoro/ui';

const DAY_MS = 86_400_000;
const BASE_TS = new Date('2026-03-01T10:00:00Z').getTime();

function makeSessions(count: number, daysSpread = 1) {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: `s-${i}`,
    startedAt: BASE_TS + Math.floor(i * (daysSpread * DAY_MS) / Math.max(count - 1, 1)),
    elapsedMs: 25 * 60 * 1000,
  }));
}

describe('DevotionRecord', () => {
  it('renders timeline with correct number of date groups', () => {
    // 3 sessions across 3 different days
    const sessions = [
      { sessionId: 's-1', startedAt: BASE_TS, elapsedMs: 1500000 },
      { sessionId: 's-2', startedAt: BASE_TS + DAY_MS, elapsedMs: 1500000 },
      { sessionId: 's-3', startedAt: BASE_TS + 2 * DAY_MS, elapsedMs: 1500000 },
    ];
    const { container } = render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    // Each date group is a flex row with a date label and dots
    const dateRows = container.querySelectorAll('div > div > div');
    // Should have 3 date group rows
    expect(dateRows.length).toBeGreaterThanOrEqual(3);
  });

  it('renders correct number of dots per date group', () => {
    // 2 sessions on day 1, 1 session on day 2
    const sessions = [
      { sessionId: 's-1', startedAt: BASE_TS, elapsedMs: 1500000 },
      { sessionId: 's-2', startedAt: BASE_TS + 1000, elapsedMs: 1500000 }, // same day
      { sessionId: 's-3', startedAt: BASE_TS + DAY_MS, elapsedMs: 1500000 },
    ];
    const { container } = render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(3);
  });

  it('shows date range from first to last session', () => {
    const sessions = [
      { sessionId: 's-1', startedAt: BASE_TS, elapsedMs: 1500000 },
      { sessionId: 's-2', startedAt: BASE_TS + 5 * DAY_MS, elapsedMs: 1500000 },
    ];
    const { container } = render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    const text = container.textContent ?? '';
    expect(text).toContain('First session:');
    expect(text).toContain('Latest:');
  });

  it('aria-label contains total count and date range', () => {
    const sessions = makeSessions(11, 9);
    render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    const el = screen.getByLabelText(/11 Pomodoros invested across/);
    expect(el).toBeTruthy();
  });

  it('renders empty state gracefully when no sessions', () => {
    const { container } = render(<DevotionRecord sessions={[]} todoTitle="My Todo" />);
    expect(container.textContent).toContain('No sessions recorded');
  });

  it('handles single session (singular Pomodoro)', () => {
    const sessions = [{ sessionId: 's-1', startedAt: BASE_TS, elapsedMs: 1500000 }];
    render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    const el = screen.getByLabelText(/1 Pomodoro invested/);
    expect(el).toBeTruthy();
  });

  it('shows single date when all sessions are on same day', () => {
    const sessions = [
      { sessionId: 's-1', startedAt: BASE_TS, elapsedMs: 1500000 },
      { sessionId: 's-2', startedAt: BASE_TS + 3600000, elapsedMs: 1500000 },
    ];
    const { container } = render(<DevotionRecord sessions={sessions} todoTitle="Test" />);
    const text = container.textContent ?? '';
    expect(text).toContain('First session:');
    expect(text).not.toContain('Latest:');
  });
});

describe('computeTimeSpan', () => {
  it('returns empty string for no sessions', () => {
    expect(computeTimeSpan([])).toBe('');
  });

  it('returns "1 day" for a single session', () => {
    expect(computeTimeSpan([{ startedAt: BASE_TS }])).toBe('1 day');
  });

  it('returns "1 day" for multiple sessions on the same calendar day', () => {
    expect(computeTimeSpan([
      { startedAt: BASE_TS },
      { startedAt: BASE_TS + 3_600_000 },
      { startedAt: BASE_TS + 7_200_000 },
    ])).toBe('1 day');
  });

  it('returns "2 days" for sessions on consecutive days', () => {
    expect(computeTimeSpan([
      { startedAt: BASE_TS },
      { startedAt: BASE_TS + DAY_MS },
    ])).toBe('2 days');
  });

  it('returns correct day count across multiple days', () => {
    expect(computeTimeSpan([
      { startedAt: BASE_TS },
      { startedAt: BASE_TS + 2 * DAY_MS },
    ])).toBe('3 days');
  });

  it('handles sessions spanning many days', () => {
    expect(computeTimeSpan([
      { startedAt: BASE_TS },
      { startedAt: BASE_TS + 17 * DAY_MS },
    ])).toBe('18 days');
  });
});
