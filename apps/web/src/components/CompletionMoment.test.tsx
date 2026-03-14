import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CompletionMoment } from '@tododoro/ui';

describe('CompletionMoment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders with todo title and pomodoro count', () => {
    render(<CompletionMoment todoTitle="Chapter 4" pomodoroCount={1} open={true} onDismiss={() => {}} />);
    expect(screen.getByText('Chapter 4 — 1 Pomodoro added')).toBeDefined();
  });

  it('renders plural pomodoro label', () => {
    render(<CompletionMoment todoTitle="Chapter 4" pomodoroCount={3} open={true} onDismiss={() => {}} />);
    expect(screen.getByText('Chapter 4 — 3 Pomodoros added')).toBeDefined();
  });

  it('renders exploration session when todoTitle is null', () => {
    render(<CompletionMoment todoTitle={null} pomodoroCount={1} open={true} onDismiss={() => {}} />);
    expect(screen.getByText('Exploration session — 1 Pomodoro')).toBeDefined();
  });

  it('shows attach and leave unlinked buttons for exploration session', () => {
    const onAttach = vi.fn();
    render(<CompletionMoment todoTitle={null} pomodoroCount={1} open={true} onDismiss={() => {}} onAttach={onAttach} />);
    expect(screen.getByText('Attach to a todo')).toBeDefined();
    expect(screen.getByText('Leave unlinked')).toBeDefined();
  });

  it('does not auto-dismiss exploration session', () => {
    const onDismiss = vi.fn();
    render(<CompletionMoment todoTitle={null} pomodoroCount={1} open={true} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('has aria-label "Session complete"', () => {
    render(<CompletionMoment todoTitle="Test" pomodoroCount={1} open={true} onDismiss={() => {}} />);
    expect(screen.getByLabelText('Session complete')).toBeDefined();
  });

  it('has aria-live="assertive" for screen reader announcement', () => {
    render(<CompletionMoment todoTitle="Test" pomodoroCount={1} open={true} onDismiss={() => {}} />);
    const el = screen.getByLabelText('Session complete');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<CompletionMoment todoTitle="Test" pomodoroCount={1} open={true} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not contain congratulatory language', () => {
    render(<CompletionMoment todoTitle="Test" pomodoroCount={1} open={true} onDismiss={() => {}} />);
    const content = document.body.textContent ?? '';
    expect(content).not.toMatch(/great|nice|well done|keep going|congrats|awesome/i);
  });

  it('does not render when open is false', () => {
    render(<CompletionMoment todoTitle="Test" pomodoroCount={1} open={false} onDismiss={() => {}} />);
    expect(screen.queryByText('Test — 1 Pomodoro added')).toBeNull();
  });
});
