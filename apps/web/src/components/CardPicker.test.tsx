import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardPicker } from '@tododoro/ui';

const ITEMS = [
  { id: 'todo-1', title: 'Write chapter', pomodoroCount: 3 },
  { id: 'todo-2', title: 'Review notes', pomodoroCount: 0 },
];

describe('CardPicker', () => {
  it('renders todo titles', () => {
    render(<CardPicker open={true} items={ITEMS} onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Write chapter')).toBeDefined();
    expect(screen.getByText('Review notes')).toBeDefined();
  });

  it('shows pomodoro count for items with sessions', () => {
    render(<CardPicker open={true} items={ITEMS} onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('3 pomodoros')).toBeDefined();
  });

  it('calls onSelect with todo id when clicked', () => {
    const onSelect = vi.fn();
    render(<CardPicker open={true} items={ITEMS} onSelect={onSelect} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Write chapter'));
    expect(onSelect).toHaveBeenCalledWith('todo-1');
  });

  it('shows "Leave unlinked" button', () => {
    render(<CardPicker open={true} items={ITEMS} onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Leave unlinked')).toBeDefined();
  });

  it('calls onCancel when "Leave unlinked" is clicked', () => {
    const onCancel = vi.fn();
    render(<CardPicker open={true} items={ITEMS} onSelect={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Leave unlinked'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows empty message when no items', () => {
    render(<CardPicker open={true} items={[]} onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('No active todos')).toBeDefined();
  });

  it('has accessible label', () => {
    render(<CardPicker open={true} items={ITEMS} onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Attach session to a todo')).toBeDefined();
  });
});
