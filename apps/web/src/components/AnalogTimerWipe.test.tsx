import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalogTimerWipe } from '@tododoro/ui';

const DURATION = 25 * 60 * 1000; // 25 min

describe('AnalogTimerWipe', () => {
  it('renders with role="timer"', () => {
    render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    expect(screen.getByRole('timer')).toBeDefined();
  });

  it('has aria-label with remaining minutes', () => {
    render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-label')).toBe('25 minutes remaining');
  });

  it('has aria-live="off" during session', () => {
    render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('off');
  });

  it('shows correct remaining time at start', () => {
    render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    expect(screen.getByText('25:00')).toBeDefined();
  });

  it('shows correct remaining time mid-session', () => {
    // 10 minutes elapsed → 15:00 remaining
    render(<AnalogTimerWipe elapsedMs={10 * 60 * 1000} configuredDurationMs={DURATION} />);
    expect(screen.getByText('15:00')).toBeDefined();
  });

  it('shows seconds remaining near end', () => {
    // 24 min 30s elapsed → 30s remaining
    render(<AnalogTimerWipe elapsedMs={24.5 * 60 * 1000} configuredDurationMs={DURATION} />);
    expect(screen.getByText('0:30')).toBeDefined();
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-label')).toBe('1 minute remaining');
  });

  it('shows 0:00 when timer is complete', () => {
    render(<AnalogTimerWipe elapsedMs={DURATION} configuredDurationMs={DURATION} />);
    expect(screen.getByText('0:00')).toBeDefined();
  });

  it('renders two SVG circles (background track + foreground fill)', () => {
    const { container } = render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('foreground circle has correct stroke-dashoffset at 0% progress', () => {
    const { container } = render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    const circles = container.querySelectorAll('circle');
    const foreground = circles[1]!;
    const circumference = 2 * Math.PI * 47; // radius = (100 - 6) / 2 = 47
    expect(Number(foreground.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference, 0);
  });

  it('foreground circle has 0 stroke-dashoffset at 100% progress', () => {
    const { container } = render(<AnalogTimerWipe elapsedMs={DURATION} configuredDurationMs={DURATION} />);
    const circles = container.querySelectorAll('circle');
    const foreground = circles[1]!;
    expect(Number(foreground.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 0);
  });

  it('foreground circle uses CSS transition (suppressed by global reduced-motion rule)', () => {
    const { container } = render(<AnalogTimerWipe elapsedMs={0} configuredDurationMs={DURATION} />);
    const circles = container.querySelectorAll('circle');
    const foreground = circles[1]!;
    // The transition is inline CSS — the global @media (prefers-reduced-motion: reduce) rule
    // overrides it with transition-duration: 0s !important
    expect(foreground.style.transition).toContain('stroke-dashoffset');
  });

  it('clamps progress to [0, 1] range', () => {
    // Over-elapsed — should clamp to 1 (offset = 0)
    const { container } = render(<AnalogTimerWipe elapsedMs={DURATION + 5000} configuredDurationMs={DURATION} />);
    const circles = container.querySelectorAll('circle');
    const foreground = circles[1]!;
    expect(Number(foreground.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 0);
  });
});
