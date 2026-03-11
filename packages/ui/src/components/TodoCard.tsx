import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

export type TodoCardData = {
  title: string;
  todoId: string;
  sessionsCount: number;
  isEditing: boolean;
  onConfirm: (title: string) => void;
  onCancel: () => void;
  onRename: (newTitle: string) => void | Promise<void>;
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

export function TodoCard({ data, dragging }: NodeProps<TodoCardNode>) {
  const { title, isEditing, onConfirm, onCancel, onRename } = data;
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
    <div style={cardStyle} className={dragging ? 'scale-[1.02] shadow-lg' : ''} onDoubleClick={handleTitleDoubleClick}>
      <span>{title}</span>
    </div>
  );
}
