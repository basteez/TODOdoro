import * as Dialog from '@radix-ui/react-dialog';
import { ShelfCard } from './ShelfCard.js';
import type { ShelfCardItem } from './ShelfCard.js';
import type { DevotionRecordSession } from './DevotionRecord.js';

export interface ShelfDrawerProps {
  open: boolean;
  onClose: () => void;
  items: ReadonlyArray<ShelfCardItem>;
  devotionRecords: ReadonlyMap<string, { sessions: ReadonlyArray<DevotionRecordSession> }>;
}

export function ShelfDrawer({ open, onClose, items, devotionRecords }: ShelfDrawerProps) {
  const sorted = [...items].sort((a, b) => {
    const dateA = a.sealedAt ?? a.releasedAt ?? 0;
    const dateB = b.sealedAt ?? b.releasedAt ?? 0;
    return dateB - dateA;
  });

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            zIndex: 48,
          }}
        />
        <Dialog.Content
          aria-label="Shelf"
          aria-describedby={undefined}
          className="motion-safe:animate-[slide-in-right_300ms_ease-out] motion-reduce:animate-none"
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            width: 360,
            maxWidth: '90vw',
            backgroundColor: 'var(--canvas-bg)',
            borderLeft: '1px solid var(--surface-border)',
            zIndex: 49,
            overflowY: 'auto',
            padding: '24px 16px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            Shelf
          </Dialog.Title>
          {sorted.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}>
              Nothing here yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((item) => (
                <ShelfCard
                  key={item.id}
                  item={item}
                  sessions={devotionRecords.get(item.id)?.sessions ?? []}
                />
              ))}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
