import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CanvasHint } from '@tododoro/ui';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CanvasHint', () => {
  it('renders centred italic hint text when isEmpty is true', () => {
    render(<CanvasHint isEmpty />);
    const hint = screen.getByText('Start with what calls to you');
    expect(hint).not.toBeNull();
    expect(hint.classList.contains('italic')).toBe(true);
  });

  it('does not render when isEmpty is false', () => {
    render(<CanvasHint isEmpty={false} />);
    expect(screen.queryByText('Start with what calls to you')).toBeNull();
  });

  it('removes hint from DOM after 3s delay + transition duration', () => {
    render(<CanvasHint isEmpty />);

    // Hint is present initially
    expect(screen.getByText('Start with what calls to you')).not.toBeNull();

    // After 3s the fade-out is triggered, after 500ms more the element is removed
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText('Start with what calls to you')).toBeNull();
  });

  it('uses data-testid for the wrapper element', () => {
    render(<CanvasHint isEmpty />);
    const wrapper = screen.getByTestId('canvas-hint');
    expect(wrapper).not.toBeNull();
  });

  it('is positioned as an absolute overlay', () => {
    render(<CanvasHint isEmpty />);
    const wrapper = screen.getByTestId('canvas-hint');
    expect(wrapper.classList.contains('absolute')).toBe(true);
    expect(wrapper.classList.contains('inset-0')).toBe(true);
  });

  it('applies text-muted colour class', () => {
    render(<CanvasHint isEmpty />);
    const hint = screen.getByText('Start with what calls to you');
    expect(hint.classList.contains('text-text-muted')).toBe(true);
  });

  it('starts with full opacity and transitions to zero after 3s', () => {
    render(<CanvasHint isEmpty />);
    const hint = screen.getByText('Start with what calls to you');

    // Initially fully visible
    expect(hint.classList.contains('opacity-100')).toBe(true);
    expect(hint.classList.contains('opacity-0')).toBe(false);

    // After 3s, opacity should transition to 0 (fading state)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const hintAfterDelay = screen.getByText('Start with what calls to you');
    expect(hintAfterDelay.classList.contains('opacity-0')).toBe(true);
    expect(hintAfterDelay.classList.contains('opacity-100')).toBe(false);
  });

  it('has motion-reduce:transition-none class for reduced-motion support', () => {
    render(<CanvasHint isEmpty />);
    const hint = screen.getByText('Start with what calls to you');
    expect(hint.classList.contains('motion-reduce:transition-none')).toBe(true);
  });

  it('re-shows hint when isEmpty toggles back to true after fade-out', () => {
    const { rerender } = render(<CanvasHint isEmpty />);

    // Wait for hint to disappear
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText('Start with what calls to you')).toBeNull();

    // Toggle isEmpty off then back on
    rerender(<CanvasHint isEmpty={false} />);
    rerender(<CanvasHint isEmpty />);

    expect(screen.getByText('Start with what calls to you')).not.toBeNull();
    expect(screen.getByText('Start with what calls to you').classList.contains('opacity-100')).toBe(true);
  });

  it('removes from DOM via setTimeout regardless of transition (reduced-motion safe)', () => {
    // In reduced-motion mode, CSS transitions are disabled but setTimeout still fires
    // The component uses a fallback setTimeout to remove from DOM after 3s + 500ms
    render(<CanvasHint isEmpty />);

    expect(screen.getByText('Start with what calls to you')).not.toBeNull();

    // Hint should still be present at 2.9s
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(screen.getByText('Start with what calls to you')).not.toBeNull();

    // Hint should be removed by 3.5s (3s delay + 500ms fallback)
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByText('Start with what calls to you')).toBeNull();
  });
});
