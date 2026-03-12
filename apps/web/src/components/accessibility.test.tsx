import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink, ShelfIcon, SettingsIcon } from '@tododoro/ui';

describe('SkipLink', () => {
  it('renders a link with "Skip to canvas" text', () => {
    render(<SkipLink />);
    const link = screen.getByText('Skip to canvas');
    expect(link).toBeTruthy();
    expect(link.tagName.toLowerCase()).toBe('a');
  });

  it('links to #main-canvas', () => {
    render(<SkipLink />);
    const link = screen.getByText('Skip to canvas') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#main-canvas');
  });

  it('is visually hidden by default (translated off-screen)', () => {
    render(<SkipLink />);
    const link = screen.getByText('Skip to canvas');
    expect(link.className).toContain('-translate-y-full');
  });
});

describe('ShelfIcon', () => {
  it('renders a button with accessible label', () => {
    render(<ShelfIcon />);
    const btn = screen.getByRole('button', { name: 'Open shelf' });
    expect(btn).toBeTruthy();
  });

  it('button is focusable (no tabIndex restriction)', () => {
    render(<ShelfIcon />);
    const btn = screen.getByRole('button', { name: 'Open shelf' }) as HTMLButtonElement;
    expect(btn.tabIndex).not.toBe(-1);
  });
});

describe('SettingsIcon', () => {
  it('renders a button with accessible label', () => {
    render(<SettingsIcon />);
    const btn = screen.getByRole('button', { name: 'Open settings' });
    expect(btn).toBeTruthy();
  });

  it('button is focusable (no tabIndex restriction)', () => {
    render(<SettingsIcon />);
    const btn = screen.getByRole('button', { name: 'Open settings' }) as HTMLButtonElement;
    expect(btn.tabIndex).not.toBe(-1);
  });
});
