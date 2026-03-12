import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevotionDots } from '@tododoro/ui';

describe('DevotionDots', () => {
  it('renders correct number of dots', () => {
    const { container } = render(<DevotionDots count={3} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(3);
  });

  it('has correct aria-label for singular', () => {
    render(<DevotionDots count={1} />);
    expect(screen.getByLabelText('1 Pomodoro invested')).toBeDefined();
  });

  it('has correct aria-label for plural', () => {
    render(<DevotionDots count={5} />);
    expect(screen.getByLabelText('5 Pomodoros invested')).toBeDefined();
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

  it('returns null when count is 0', () => {
    const { container } = render(<DevotionDots count={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when count is negative', () => {
    const { container } = render(<DevotionDots count={-1} />);
    expect(container.innerHTML).toBe('');
  });
});
