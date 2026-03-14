import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoCard } from '@tododoro/ui';
import type { TodoCardData } from '@tododoro/ui';

function renderTodoCard(data: Partial<TodoCardData> = {}, dragging = false) {
  const defaultData: TodoCardData = {
    title: 'Test todo',
    todoId: 'todo-1',
    sessionsCount: 0,
    isEditing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onRename: vi.fn(),
    ...data,
  };
  // TodoCard uses NodeProps which requires additional React Flow fields;
  // cast through unknown since only `data` is used by the component logic.
  const props = {
    id: 'test-node',
    type: 'todoCard',
    data: defaultData,
    dragging,
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
  describe('drag state', () => {
    it('applies scale-[1.02] and shadow-lg classes when dragging', () => {
      const { container } = renderTodoCard({}, true);
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain('scale-[1.02]');
      expect(card.className).toContain('shadow-lg');
    });

    it('does not apply drag classes when not dragging', () => {
      const { container } = renderTodoCard({}, false);
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).not.toContain('scale-[1.02]');
      expect(card.className).not.toContain('shadow-lg');
    });
  });

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

    it('has aria-label with title, pomodoro count and state', () => {
      renderTodoCard({ title: 'My task' });
      const card = screen.getByLabelText('My task, 0 Pomodoros invested, idle');
      expect(card).toBeTruthy();
    });

    it('has focus ring Tailwind classes for keyboard accessibility', () => {
      const { container } = renderTodoCard();
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain('focus-visible:ring-2');
      expect(card.className).toContain('focus-visible:ring-session-active');
    });
  });

  describe('action menu (isMenuOpen)', () => {
    it('does not show action menu when isMenuOpen is false', () => {
      renderTodoCard({ isMenuOpen: false });
      expect(screen.queryByText('Rename')).toBeNull();
    });

    it('shows Rename menu item when isMenuOpen is true', () => {
      renderTodoCard({ isMenuOpen: true });
      expect(screen.getByText('Rename')).toBeTruthy();
    });

    it('enters rename mode when Rename menu item is selected', () => {
      renderTodoCard({ title: 'My todo', isMenuOpen: true });
      fireEvent.click(screen.getByText('Rename'));
      expect(screen.getByRole('textbox')).toBeTruthy();
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

  describe('seal menu item', () => {
    it('shows Seal menu item when sessionsCount > 0', () => {
      renderTodoCard({ sessionsCount: 3, isMenuOpen: true });
      expect(screen.getByText('Seal')).toBeTruthy();
    });

    it('hides Seal menu item when sessionsCount is 0', () => {
      renderTodoCard({ sessionsCount: 0, isMenuOpen: true });
      expect(screen.queryByText('Seal')).toBeNull();
    });

    it('calls onSeal with todoId when Seal is selected', () => {
      const onSeal = vi.fn();
      renderTodoCard({ sessionsCount: 2, isMenuOpen: true, onSeal, todoId: 'test-todo' });
      fireEvent.click(screen.getByText('Seal'));
      expect(onSeal).toHaveBeenCalledWith('test-todo');
    });
  });

  describe('devotion record popover', () => {
    it('opens Devotion Record popover when DevotionDots is clicked', () => {
      const sessions = [
        { sessionId: 's-1', startedAt: new Date('2026-03-01T10:00:00Z').getTime(), elapsedMs: 1500000 },
      ];
      renderTodoCard({ sessionsCount: 1, devotionSessions: sessions });
      const dotsButton = screen.getByLabelText('Open Devotion Record');
      fireEvent.click(dotsButton);
      expect(screen.getByText(/First session:/)).toBeTruthy();
    });

    it('does not show popover when DevotionDots is not clicked', () => {
      const sessions = [
        { sessionId: 's-1', startedAt: new Date('2026-03-01T10:00:00Z').getTime(), elapsedMs: 1500000 },
      ];
      renderTodoCard({ sessionsCount: 1, devotionSessions: sessions });
      expect(screen.queryByText(/First session:/)).toBeNull();
    });
  });

  describe('rename mode (double-click)', () => {
    it('enters rename mode on double-click of title', () => {
      renderTodoCard({ title: 'My todo' });
      fireEvent.dblClick(screen.getByText('My todo'));
      expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('enters rename mode on double-click of card wrapper (not just title text)', () => {
      const { container } = renderTodoCard({ title: 'My todo' });
      fireEvent.dblClick(container.firstElementChild as HTMLElement);
      expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('pre-fills input with the current title', () => {
      renderTodoCard({ title: 'Original title' });
      fireEvent.dblClick(screen.getByText('Original title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Original title');
    });

    it('calls onRename with new title on Enter when changed and non-empty', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New title' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onRename).toHaveBeenCalledTimes(1);
      expect(onRename).toHaveBeenCalledWith('New title');
    });

    it('does not call onRename on Enter when title is whitespace-only', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('does not call onRename and exits rename mode on Enter when title is empty', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('does not call onRename and exits rename mode on Enter when title is unchanged', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Same title', onRename });
      fireEvent.dblClick(screen.getByText('Same title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('cancels rename on Escape without calling onRename', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Changed' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('calls onRename on blur when title changed and non-empty', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New title' } });
      fireEvent.blur(input);
      expect(onRename).toHaveBeenCalledWith('New title');
    });

    it('does not call onRename on blur when title is empty', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Old title', onRename });
      fireEvent.dblClick(screen.getByText('Old title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      expect(onRename).not.toHaveBeenCalled();
    });

    it('does not call onRename on blur when title is unchanged', () => {
      const onRename = vi.fn();
      renderTodoCard({ title: 'Same title', onRename });
      fireEvent.dblClick(screen.getByText('Same title'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.blur(input);
      expect(onRename).not.toHaveBeenCalled();
    });
  });
});
