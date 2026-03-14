import * as Dialog from '@radix-ui/react-dialog';

export interface CardPickerItem {
  id: string;
  title: string;
  pomodoroCount: number;
}

export interface CardPickerProps {
  open: boolean;
  items: ReadonlyArray<CardPickerItem>;
  onSelect: (todoId: string) => void;
  onCancel: () => void;
}

export function CardPicker({ open, items, onSelect, onCancel }: CardPickerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 51,
          }}
        />
        <Dialog.Content
          aria-label="Attach session to a todo"
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            borderRadius: 12,
            padding: '24px',
            zIndex: 52,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-primary)',
            maxWidth: 360,
            width: '90vw',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 14,
              fontWeight: 500,
              margin: '0 0 16px 0',
              color: 'var(--text-secondary)',
            }}
          >
            Attach to a todo
          </Dialog.Title>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
              No active todos
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: 4,
                      background: 'none',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    {item.pomodoroCount > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.pomodoroCount} {item.pomodoroCount === 1 ? 'pomodoro' : 'pomodoros'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={onCancel}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 12,
              padding: '8px 12px',
              background: 'none',
              border: '1px solid var(--surface-border)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            Leave unlinked
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
