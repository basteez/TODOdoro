import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

export type TodoCardData = {
  title: string;
  todoId: string;
  sessionsCount: number;
  isEditing: boolean;
  onConfirm: (title: string) => void;
  onCancel: () => void;
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

export function TodoCard({ data }: NodeProps<TodoCardNode>) {
  const { title, isEditing, onConfirm, onCancel } = data;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // React Flow wraps nodes in containers that can delay DOM readiness;
      // requestAnimationFrame ensures focus fires after the node is painted.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isEditing]);

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

  if (isEditing) {
    return (
      <div style={cardStyle}>
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

  return (
    <div style={cardStyle}>
      <span>{title}</span>
    </div>
  );
}
