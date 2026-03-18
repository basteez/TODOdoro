import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShelfCard } from '@tododoro/ui';
import type { ShelfCardItem, DevotionRecordSession } from '@tododoro/ui';

const sealedItem: ShelfCardItem = {
  id: 'todo-1',
  title: 'Finished project',
  pomodoroCount: 5,
  sealedAt: new Date('2026-03-15T10:00:00Z').getTime(),
  releasedAt: null,
  releaseReason: null,
  lifecycleStatus: 'sealed',
};

const releasedItem: ShelfCardItem = {
  id: 'todo-2',
  title: 'Abandoned idea',
  pomodoroCount: 2,
  sealedAt: null,
  releasedAt: new Date('2026-03-14T10:00:00Z').getTime(),
  releaseReason: 'was_never_truly_mine',
  lifecycleStatus: 'released',
};

const sessions: DevotionRecordSession[] = [
  { sessionId: 's-1', startedAt: new Date('2026-03-10T10:00:00Z').getTime(), elapsedMs: 1500000 },
  { sessionId: 's-2', startedAt: new Date('2026-03-11T10:00:00Z').getTime(), elapsedMs: 1500000 },
];

describe('ShelfCard', () => {
  it('renders todo title', () => {
    render(<ShelfCard item={sealedItem} sessions={sessions} />);
    expect(screen.getByText('Finished project')).toBeTruthy();
  });

  it('renders Sealed badge for sealed items', () => {
    render(<ShelfCard item={sealedItem} sessions={sessions} />);
    expect(screen.getByText('Sealed')).toBeTruthy();
  });

  it('renders Released badge for released items', () => {
    render(<ShelfCard item={releasedItem} sessions={sessions} />);
    expect(screen.getByText('Released')).toBeTruthy();
  });

  it('renders DevotionRecord when sessions exist', () => {
    render(<ShelfCard item={sealedItem} sessions={sessions} />);
    expect(screen.getByText(/First session:/)).toBeTruthy();
  });

  it('does not render DevotionRecord when no sessions', () => {
    render(<ShelfCard item={sealedItem} sessions={[]} />);
    expect(screen.queryByText(/First session:/)).toBeNull();
  });

  it('renders sealed date', () => {
    render(<ShelfCard item={sealedItem} sessions={[]} />);
    expect(screen.getByText(/Sealed Mar 15/)).toBeTruthy();
  });

  it('renders released date', () => {
    render(<ShelfCard item={releasedItem} sessions={[]} />);
    expect(screen.getByText(/Released Mar 14/)).toBeTruthy();
  });
});
