import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReleaseEulogy } from '@tododoro/ui';
import type { DevotionRecordSession } from '@tododoro/ui';

const sessions: DevotionRecordSession[] = [
  { sessionId: 's-1', startedAt: new Date('2026-03-01T10:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-2', startedAt: new Date('2026-03-01T11:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-3', startedAt: new Date('2026-03-02T10:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-4', startedAt: new Date('2026-03-02T14:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-5', startedAt: new Date('2026-03-03T09:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-6', startedAt: new Date('2026-03-03T15:00:00Z').getTime(), elapsedMs: 1500000 },
];

describe('ReleaseEulogy', () => {
  it('renders framing copy with pomodoro count', () => {
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/You invested 6 Pomodoros/)).toBeTruthy();
  });

  it('renders DevotionRecord timeline inside the dialog', () => {
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/First session:/)).toBeTruthy();
  });

  it('renders Continue button', () => {
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onContinue when Continue button is clicked', () => {
    const onContinue = vi.fn();
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={onContinue}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('has aria-label "Release eulogy" on the dialog', () => {
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Release eulogy')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(
      <ReleaseEulogy
        open={false}
        todoTitle="Big project"
        pomodoroCount={6}
        sessions={sessions}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText('Continue')).toBeNull();
  });

  it('uses singular "Pomodoro" for count of 1', () => {
    render(
      <ReleaseEulogy
        open={true}
        todoTitle="Small task"
        pomodoroCount={1}
        sessions={[sessions[0]!]}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/You invested 1 Pomodoro\b/)).toBeTruthy();
  });
});
