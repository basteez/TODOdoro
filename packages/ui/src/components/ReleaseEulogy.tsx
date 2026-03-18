import * as Dialog from '@radix-ui/react-dialog';
import { DevotionRecord } from './DevotionRecord.js';
import type { DevotionRecordSession } from './DevotionRecord.js';

export interface ReleaseEulogyProps {
  open: boolean;
  todoTitle: string;
  pomodoroCount: number;
  sessions: ReadonlyArray<DevotionRecordSession>;
  onContinue: () => void;
  onCancel: () => void;
}

export function ReleaseEulogy({ open, todoTitle, pomodoroCount, sessions, onContinue, onCancel }: ReleaseEulogyProps) {
  const label = pomodoroCount === 1 ? '1 Pomodoro' : `${pomodoroCount} Pomodoros`;

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
          aria-label="Release eulogy"
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
            maxWidth: 400,
            width: '90vw',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 16,
              fontWeight: 500,
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            You invested {label}. It&rsquo;s okay to let it go.
          </Dialog.Title>
          <DevotionRecord sessions={sessions} todoTitle={todoTitle} />
          <button
            onClick={onContinue}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              backgroundColor: 'var(--released)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            Continue
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
