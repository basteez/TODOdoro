import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export interface CompletionMomentProps {
  todoTitle: string | null;
  pomodoroCount: number;
  open: boolean;
  onDismiss: () => void;
  onAttach?: (() => void) | undefined;
}

export function CompletionMoment({ todoTitle, pomodoroCount, open, onDismiss, onAttach }: CompletionMomentProps) {
  const isExploration = todoTitle === null;

  // Auto-dismiss after 3 seconds (linked sessions only)
  useEffect(() => {
    if (!open || isExploration) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [open, onDismiss, isExploration]);

  // Dismiss on any keypress (linked sessions: any key; exploration: Escape only → leave unlinked)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (isExploration) {
        if (e.key === 'Escape') onDismiss();
      } else {
        onDismiss();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onDismiss, isExploration]);

  // Dismiss on click anywhere (linked sessions only)
  useEffect(() => {
    if (!open || isExploration) return;
    function handleClick() {
      onDismiss();
    }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [open, onDismiss, isExploration]);

  const label = pomodoroCount === 1 ? '1 Pomodoro' : `${pomodoroCount} Pomodoros`;

  return (
    <Dialog.Root open={open} modal={false}>
      <Dialog.Content
        aria-label="Session complete"
        aria-live="assertive"
        aria-describedby={undefined}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 12,
          padding: '24px 32px',
          zIndex: 50,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text-primary)',
          maxWidth: 320,
        }}
      >
        <Dialog.Title
          style={{
            fontSize: 16,
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {isExploration
            ? `Exploration session — ${label}`
            : `${todoTitle} — ${label} added`}
        </Dialog.Title>
        {isExploration && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onAttach && (
              <button
                onClick={onAttach}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--session-active)',
                  color: 'var(--surface)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                Attach to a todo
              </button>
            )}
            <button
              onClick={onDismiss}
              style={{
                padding: '8px 16px',
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
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
