import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShelfDrawer } from '@tododoro/ui';
import type { ShelfCardItem } from '@tododoro/ui';

const items: ShelfCardItem[] = [
  {
    id: 'todo-1',
    title: 'Sealed todo',
    pomodoroCount: 3,
    sealedAt: new Date('2026-03-15T10:00:00Z').getTime(),
    releasedAt: null,
    releaseReason: null,
    lifecycleStatus: 'sealed',
  },
  {
    id: 'todo-2',
    title: 'Released todo',
    pomodoroCount: 1,
    sealedAt: null,
    releasedAt: new Date('2026-03-14T10:00:00Z').getTime(),
    releaseReason: 'completed_its_purpose',
    lifecycleStatus: 'released',
  },
];

const devotionRecords = new Map<string, { sessions: Array<{ sessionId: string; startedAt: number; elapsedMs: number }> }>([
  ['todo-1', { sessions: [{ sessionId: 's-1', startedAt: Date.now(), elapsedMs: 1500000 }] }],
]);

describe('ShelfDrawer', () => {
  it('renders items when open', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={items} devotionRecords={devotionRecords} />);
    expect(screen.getByText('Sealed todo')).toBeTruthy();
    expect(screen.getByText('Released todo')).toBeTruthy();
  });

  it('has aria-label "Shelf"', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={items} devotionRecords={devotionRecords} />);
    expect(screen.getByLabelText('Shelf')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ShelfDrawer open={false} onClose={vi.fn()} items={items} devotionRecords={devotionRecords} />);
    expect(screen.queryByText('Sealed todo')).toBeNull();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ShelfDrawer open={true} onClose={onClose} items={items} devotionRecords={devotionRecords} />);
    fireEvent.keyDown(screen.getByLabelText('Shelf'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('sorts items with most recent first', () => {
    // Pass items in reverse order to verify sort actually reorders
    const reversed = [...items].reverse();
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={reversed} devotionRecords={devotionRecords} />);
    const titles = screen.getAllByText(/todo$/).map((el) => el.textContent);
    expect(titles[0]).toBe('Sealed todo');
    expect(titles[1]).toBe('Released todo');
  });

  it('renders title "Shelf"', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={items} devotionRecords={devotionRecords} />);
    expect(screen.getByText('Shelf')).toBeTruthy();
  });

  it('shows "Nothing here yet" when items is empty', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={[]} devotionRecords={new Map()} />);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
  });

  it('does not show empty state when items exist', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={items} devotionRecords={devotionRecords} />);
    expect(screen.queryByText('Nothing here yet')).toBeNull();
  });

  it('empty state has no buttons or links', () => {
    render(<ShelfDrawer open={true} onClose={vi.fn()} items={[]} devotionRecords={new Map()} />);
    const dialog = screen.getByLabelText('Shelf');
    expect(dialog.querySelectorAll('a').length).toBe(0);
    // Only the Close button from Radix or none — no CTA buttons
    const buttons = dialog.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
