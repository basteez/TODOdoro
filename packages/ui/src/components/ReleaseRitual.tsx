import * as Dialog from '@radix-ui/react-dialog';

export type ReleaseReason = 'completed_its_purpose' | 'was_never_truly_mine';

export interface ReleaseRitualProps {
  open: boolean;
  onSelect: (reason: ReleaseReason) => void;
  onCancel: () => void;
}

export function ReleaseRitual({ open, onSelect, onCancel }: ReleaseRitualProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 49,
          }}
        />
        <Dialog.Content
          aria-label="Release todo"
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            borderRadius: 12,
            padding: '32px',
            zIndex: 50,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-primary)',
            maxWidth: 360,
            width: '90vw',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 16,
              fontWeight: 500,
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}
          >
            How would you describe this letting go?
          </Dialog.Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => onSelect('completed_its_purpose')}
              style={{
                padding: '14px 20px',
                backgroundColor: 'var(--released)',
                color: 'var(--surface)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Completed its purpose
            </button>
            <button
              onClick={() => onSelect('was_never_truly_mine')}
              style={{
                padding: '14px 20px',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Was never truly mine
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
