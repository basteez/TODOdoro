import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReleaseRitual } from '@tododoro/ui';

describe('ReleaseRitual', () => {
  it('renders two reason buttons when open', () => {
    render(<ReleaseRitual open={true} onSelect={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Completed its purpose')).toBeTruthy();
    expect(screen.getByText('Was never truly mine')).toBeTruthy();
  });

  it('does not render buttons when closed', () => {
    render(<ReleaseRitual open={false} onSelect={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Completed its purpose')).toBeNull();
  });

  it('calls onSelect with completed_its_purpose when first button clicked', () => {
    const onSelect = vi.fn();
    render(<ReleaseRitual open={true} onSelect={onSelect} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Completed its purpose'));
    expect(onSelect).toHaveBeenCalledWith('completed_its_purpose');
  });

  it('calls onSelect with was_never_truly_mine when second button clicked', () => {
    const onSelect = vi.fn();
    render(<ReleaseRitual open={true} onSelect={onSelect} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Was never truly mine'));
    expect(onSelect).toHaveBeenCalledWith('was_never_truly_mine');
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ReleaseRitual open={true} onSelect={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('has aria-label "Release todo" on the dialog', () => {
    render(<ReleaseRitual open={true} onSelect={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Release todo')).toBeTruthy();
  });

  it('does not contain warning language like "Are you sure"', () => {
    render(<ReleaseRitual open={true} onSelect={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).not.toContain('Are you sure');
    expect(dialog.textContent).not.toContain('warning');
    expect(dialog.textContent).not.toContain('Cancel');
  });
});
