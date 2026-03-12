import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplorationButton } from '@tododoro/ui';

describe('ExplorationButton', () => {
  it('renders with accessible label', () => {
    render(<ExplorationButton onClick={() => {}} />);
    expect(screen.getByLabelText('Start exploration session')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ExplorationButton onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Start exploration session'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<ExplorationButton disabled={true} onClick={() => {}} />);
    const button = screen.getByLabelText('Start exploration session') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<ExplorationButton disabled={true} onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Start exploration session'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has minimum 44x44px touch target', () => {
    render(<ExplorationButton onClick={() => {}} />);
    const button = screen.getByLabelText('Start exploration session');
    expect(button.style.width).toBe('44px');
    expect(button.style.height).toBe('44px');
  });
});
