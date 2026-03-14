import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevotionDots } from '@tododoro/ui';

describe('DevotionDots', () => {
  it('renders N filled dots + (maxVisible - N) empty dots when count < maxVisible', () => {
    const { container } = render(<DevotionDots count={3} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(5); // default maxVisible = 5

    const filled = Array.from(dots).filter((d) => (d as HTMLElement).style.opacity === '1');
    const empty = Array.from(dots).filter((d) => (d as HTMLElement).style.opacity === '0.25');
    expect(filled.length).toBe(3);
    expect(empty.length).toBe(2);
  });

  it('renders N filled dots with zero empty dots when count >= maxVisible', () => {
    const { container } = render(<DevotionDots count={7} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(7);

    const empty = Array.from(dots).filter((d) => (d as HTMLElement).style.opacity === '0.25');
    expect(empty.length).toBe(0);
  });

  it('renders exactly maxVisible slots when count < maxVisible', () => {
    const { container } = render(<DevotionDots count={2} maxVisible={4} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(4);

    const filled = Array.from(dots).filter((d) => (d as HTMLElement).style.opacity === '1');
    const empty = Array.from(dots).filter((d) => (d as HTMLElement).style.opacity === '0.25');
    expect(filled.length).toBe(2);
    expect(empty.length).toBe(2);
  });

  it('returns null when count is 0', () => {
    const { container } = render(<DevotionDots count={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when count is negative', () => {
    const { container } = render(<DevotionDots count={-1} />);
    expect(container.innerHTML).toBe('');
  });

  it('has correct aria-label for singular', () => {
    render(<DevotionDots count={1} />);
    expect(screen.getByLabelText('1 Pomodoro invested')).toBeDefined();
  });

  it('has correct aria-label for plural', () => {
    render(<DevotionDots count={5} />);
    expect(screen.getByLabelText('5 Pomodoros invested')).toBeDefined();
  });

  it('filled dots have full opacity, empty dots have 0.25 opacity', () => {
    const { container } = render(<DevotionDots count={2} maxVisible={3} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');

    expect((dots[0] as HTMLElement).style.opacity).toBe('1');
    expect((dots[1] as HTMLElement).style.opacity).toBe('1');
    expect((dots[2] as HTMLElement).style.opacity).toBe('0.25');
  });

  it('renders dots with amber color', () => {
    const { container } = render(<DevotionDots count={1} />);
    const dot = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--devotion)');
  });

  it('renders dots at 6px diameter', () => {
    const { container } = render(<DevotionDots count={1} />);
    const dot = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.width).toBe('6px');
    expect(dot.style.height).toBe('6px');
  });

  it('calls onClick when provided and button is clicked', () => {
    const onClick = vi.fn();
    render(<DevotionDots count={3} onClick={onClick} />);
    const button = screen.getByLabelText('Open Devotion Record');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('wraps dots in a button when onClick is provided', () => {
    const onClick = vi.fn();
    render(<DevotionDots count={2} onClick={onClick} />);
    const button = screen.getByLabelText('Open Devotion Record');
    expect(button.tagName).toBe('BUTTON');
    expect(button.style.cursor).toBe('pointer');
  });

  it('does not render a button when onClick is not provided', () => {
    render(<DevotionDots count={2} />);
    expect(screen.queryByLabelText('Open Devotion Record')).toBeNull();
  });
});
