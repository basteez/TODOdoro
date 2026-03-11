import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoCard } from '@tododoro/ui';
import type { TodoCardData } from '@tododoro/ui';

function renderTodoCard(data: Partial<TodoCardData> = {}) {
  const defaultData: TodoCardData = {
    title: 'Test todo',
    todoId: 'todo-1',
    sessionsCount: 0,
    isEditing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...data,
  };
  // TodoCard uses NodeProps which requires additional React Flow fields;
  // cast through unknown since only `data` is used by the component logic.
  const props = {
    id: 'test-node',
    type: 'todoCard',
    data: defaultData,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    selected: false,
    draggable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as React.ComponentProps<typeof TodoCard>;
  return render(<TodoCard {...props} />);
}

describe('TodoCard', () => {
  describe('idle state', () => {
    it('renders the title text', () => {
      renderTodoCard();
      expect(screen.getByText('Test todo')).toBeTruthy();
    });

    it('applies correct card styling with surface background and border', () => {
      const { container } = renderTodoCard();
      const card = container.firstElementChild as HTMLElement;
      expect(card).toBeTruthy();
      expect(card.style.backgroundColor).toBe('var(--surface)');
      expect(card.style.border).toBe('1px solid var(--surface-border)');
    });
  });

  describe('editing state', () => {
    it('renders an input when isEditing is true', () => {
      renderTodoCard({ isEditing: true });
      expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('calls onConfirm with trimmed title on Enter', () => {
      const onConfirm = vi.fn();
      renderTodoCard({ isEditing: true, onConfirm });

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New todo' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onConfirm).toHaveBeenCalledWith('New todo');
    });

    it('calls onCancel on Escape', () => {
      const onCancel = vi.fn();
      renderTodoCard({ isEditing: true, onCancel });

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalled();
    });

    it('treats empty title on confirm as cancel', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      renderTodoCard({ isEditing: true, onConfirm, onCancel });

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('treats whitespace-only title on confirm as cancel', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      renderTodoCard({ isEditing: true, onConfirm, onCancel });

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('calls onConfirm with title on blur when title is non-empty', () => {
      const onConfirm = vi.fn();
      renderTodoCard({ isEditing: true, onConfirm });

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'My title' } });
      fireEvent.blur(input);
      expect(onConfirm).toHaveBeenCalledWith('My title');
    });

    it('calls onCancel on blur when title is empty', () => {
      const onCancel = vi.fn();
      renderTodoCard({ isEditing: true, onCancel });

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
