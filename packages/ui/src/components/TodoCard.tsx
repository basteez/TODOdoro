import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import type { Node, NodeProps } from '@xyflow/react';
import { DevotionDots } from './DevotionDots.js';
import { DevotionRecord } from './DevotionRecord.js';
import type { DevotionRecordSession } from './DevotionRecord.js';

export type TodoCardData = {
  title: string;
  todoId: string;
  sessionsCount: number;
  isEditing: boolean;
  isMenuOpen?: boolean;
  isSessionActive?: boolean;
  isActiveCard?: boolean;
  isLeaving?: boolean | undefined;
  devotionSessions?: ReadonlyArray<DevotionRecordSession>;
  onConfirm: (title: string) => void;
  onCancel: () => void;
  onRename: (newTitle: string) => void | Promise<void>;
  onMenuClose?: () => void;
  onStartSession?: (todoId: string) => void;
  onSeal?: (todoId: string) => void;
  onRelease?: ((todoId: string) => void) | undefined;
  [key: string]: unknown;
};

export type TodoCardNode = Node<TodoCardData, 'todoCard'>;

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  padding: '20px 24px',
  minWidth: 160,
  minHeight: 72,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  fontSize: 15,
  color: 'var(--text-primary)',
  boxSizing: 'border-box' as const,
  borderRadius: 8,
  position: 'relative',
};

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text-primary)',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  fontSize: 15,
  width: '100%',
};

const dropdownContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 6,
  padding: '4px',
  minWidth: 140,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)',
  outline: 'none',
};

export function TodoCard({ data, dragging }: NodeProps<TodoCardNode>) {
  const { title, todoId, sessionsCount, isEditing, isMenuOpen, isSessionActive, isActiveCard, isLeaving, devotionSessions, onConfirm, onCancel, onRename, onMenuClose, onStartSession, onSeal, onRelease } = data;
  const [devotionOpen, setDevotionOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // React Flow's NodeWrapper manages focus on its own wrapper div, reclaiming
  // it after rAF. Use setTimeout to focus after React Flow's handlers settle.
  useEffect(() => {
    if (isEditing) {
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isRenaming) {
      const id = setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isRenaming]);

  // Prevent React Flow's NodeWrapper from stealing focus back on click inside the card
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        onCancel();
      } else {
        onConfirm(trimmed);
      }
    }
  }

  function handleBlur() {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      onCancel();
    } else {
      onConfirm(trimmed);
    }
  }

  function handleRenameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsRenaming(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = renameValue.trim();
      if (trimmed.length > 0 && trimmed !== title) {
        onRename(trimmed);
      }
      setIsRenaming(false);
    }
  }

  function handleRenameBlur() {
    const trimmed = renameValue.trim();
    if (trimmed.length > 0 && trimmed !== title) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  }

  function handleTitleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setRenameValue(title);
    setIsRenaming(true);
  }

  if (isEditing) {
    return (
      <div style={cardStyle} onMouseDown={handleMouseDown}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={inputStyle}
          placeholder="What calls to you?"
        />
      </div>
    );
  }

  if (isRenaming) {
    return (
      <div style={cardStyle} onMouseDown={handleMouseDown}>
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameBlur}
          style={inputStyle}
        />
      </div>
    );
  }

  const dimmed = isSessionActive && !isActiveCard;
  const activeRing = isActiveCard;

  const activeCardStyle: React.CSSProperties = {
    ...cardStyle,
    ...(activeRing ? { boxShadow: '0 0 0 2px var(--session-active)', borderColor: 'var(--session-active)' } : {}),
    ...(dimmed ? { opacity: 0.4 } : {}),
  };

  function handleStartClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onStartSession?.(todoId);
  }

  return (
    <div
      ref={cardRef}
      style={activeCardStyle}
      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-session-active focus-visible:ring-offset-2${dragging ? ' scale-[1.02] shadow-lg' : ''}${isLeaving ? ' opacity-0 translate-y-4 transition-all duration-250 ease-in' : ''}`}
      aria-label={`${title}, ${sessionsCount} Pomodoro${sessionsCount !== 1 ? 's' : ''} invested, ${isActiveCard ? 'active session' : 'idle'}`}
      tabIndex={0}
      onDoubleClick={handleTitleDoubleClick}
    >
      <span style={{ paddingRight: 36 }}>{title}</span>
      {sessionsCount > 0 && (
        <Popover.Root open={devotionOpen} onOpenChange={setDevotionOpen}>
          <Popover.Trigger asChild>
            <span onMouseDown={(e) => e.stopPropagation()}>
              <DevotionDots
                count={sessionsCount}
                onClick={() => setDevotionOpen((o) => !o)}
              />
            </span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={8}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                borderRadius: 12,
                zIndex: 50,
                maxWidth: 320,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DevotionRecord
                sessions={devotionSessions ?? []}
                todoTitle={title}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      <button
        aria-label={`Start session for ${title}`}
        disabled={isSessionActive}
        onClick={handleStartClick}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: isSessionActive ? 'not-allowed' : 'pointer',
          opacity: isSessionActive ? 0.3 : 0.6,
          color: 'var(--session-active)',
          padding: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
          <polygon points="4,2 16,9 4,16" />
        </svg>
      </button>
      <DropdownMenu.Root
        open={isMenuOpen ?? false}
        onOpenChange={(open) => {
          if (!open) onMenuClose?.();
        }}
      >
        <DropdownMenu.Trigger
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, border: 0, padding: 0, overflow: 'hidden', pointerEvents: 'none' }}
        />
        <DropdownMenu.Content
          style={dropdownContentStyle}
          sideOffset={4}
          onCloseAutoFocus={(e) => { e.preventDefault(); cardRef.current?.focus(); }}
        >
          <DropdownMenu.Item
            style={dropdownItemStyle}
            onSelect={() => {
              setRenameValue(title);
              setIsRenaming(true);
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-border)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            Rename
          </DropdownMenu.Item>
          {sessionsCount > 0 && (
            <DropdownMenu.Item
              style={dropdownItemStyle}
              onSelect={() => onSeal?.(todoId)}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-border)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Seal
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            style={dropdownItemStyle}
            onSelect={() => onRelease?.(todoId)}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-border)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            Release
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
