import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@tododoro/ui';

const MS_PER_MIN = 60 * 1000;

function renderPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    workDurationMs: 25 * MS_PER_MIN,
    shortBreakMs: 5 * MS_PER_MIN,
    longBreakMs: 15 * MS_PER_MIN,
    onWorkDurationChange: vi.fn(),
    onShortBreakChange: vi.fn(),
    onLongBreakChange: vi.fn(),
    theme: 'dark' as const,
    onThemeChange: vi.fn(),
    ...overrides,
  };
  render(<SettingsPanel {...props} />);
  return props;
}

describe('SettingsPanel', () => {
  it('renders dialog with Settings title when open', () => {
    renderPanel();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('has aria-label "Settings"', () => {
    renderPanel();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
  });

  it('does not render when closed', () => {
    renderPanel({ open: false });
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('calls onClose when Escape is pressed', () => {
    const props = renderPanel();
    fireEvent.keyDown(screen.getByLabelText('Settings'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('renders three slider labels', () => {
    renderPanel();
    expect(screen.getByText('Work session')).toBeTruthy();
    expect(screen.getByText('Short break')).toBeTruthy();
    expect(screen.getByText('Long break')).toBeTruthy();
  });

  it('displays current values in minutes', () => {
    renderPanel();
    expect(screen.getByText('25 min')).toBeTruthy();
    expect(screen.getByText('5 min')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });

  it('displays updated values when props change', () => {
    renderPanel({
      workDurationMs: 45 * MS_PER_MIN,
      shortBreakMs: 10 * MS_PER_MIN,
      longBreakMs: 30 * MS_PER_MIN,
    });
    expect(screen.getByText('45 min')).toBeTruthy();
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('renders three sliders with correct aria-labels', () => {
    renderPanel();
    expect(screen.getByRole('slider', { name: 'Work session' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Short break' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Long break' })).toBeTruthy();
  });

  it('sliders have correct current values', () => {
    renderPanel();
    const workSlider = screen.getByRole('slider', { name: 'Work session' });
    expect(workSlider.getAttribute('aria-valuenow')).toBe('25');

    const shortSlider = screen.getByRole('slider', { name: 'Short break' });
    expect(shortSlider.getAttribute('aria-valuenow')).toBe('5');

    const longSlider = screen.getByRole('slider', { name: 'Long break' });
    expect(longSlider.getAttribute('aria-valuenow')).toBe('15');
  });

  it('sliders have correct min/max ranges', () => {
    renderPanel();
    const workSlider = screen.getByRole('slider', { name: 'Work session' });
    expect(workSlider.getAttribute('aria-valuemin')).toBe('5');
    expect(workSlider.getAttribute('aria-valuemax')).toBe('90');

    const shortSlider = screen.getByRole('slider', { name: 'Short break' });
    expect(shortSlider.getAttribute('aria-valuemin')).toBe('1');
    expect(shortSlider.getAttribute('aria-valuemax')).toBe('30');

    const longSlider = screen.getByRole('slider', { name: 'Long break' });
    expect(longSlider.getAttribute('aria-valuemin')).toBe('1');
    expect(longSlider.getAttribute('aria-valuemax')).toBe('60');
  });

  it('sliders are keyboard-focusable', () => {
    renderPanel();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    for (const slider of sliders) {
      expect(slider.tabIndex).not.toBe(-1);
    }
  });

  it('renders theme radiogroup with three options', () => {
    renderPanel();
    const radiogroup = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(radiogroup).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'System' })).toBeTruthy();
  });

  it('shows current theme as checked', () => {
    renderPanel({ theme: 'light' });
    expect(screen.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('false');
  });

  it('calls onThemeChange when a theme option is clicked', () => {
    const props = renderPanel({ theme: 'dark' });
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(props.onThemeChange).toHaveBeenCalledWith('light');
  });
});
