import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Node, NodeProps } from '@xyflow/react';

export type TodoCardData = {
  title: string;
  todoId: string;
  sessionsCount: number;
  isEditing: boolean;
  isMenuOpen?: boolean;
  onConfirm: (title: string) => void;
  onCancel: () => void;
  onRename: (newTitle: string) => void | Promise<void>;
  onMenuClose?: () => void;
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
  const { title, isEditing, isMenuOpen, onConfirm, onCancel, onRename, onMenuClose } = data;
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

  return (
    <DropdownMenu.Root
      open={isMenuOpen ?? false}
      onOpenChange={(open) => {
        if (!open) onMenuClose?.();
      }}
    >
      <DropdownMenu.Trigger asChild>
        <div
          style={cardStyle}
          className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-session-active focus-visible:ring-offset-2${dragging ? ' scale-[1.02] shadow-lg' : ''}`}
          aria-label={`${title}, 0 Pomodoros invested, idle`}
          onDoubleClick={handleTitleDoubleClick}
        >
          <span>{title}</span>
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content style={dropdownContentStyle} sideOffset={4}>
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
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
