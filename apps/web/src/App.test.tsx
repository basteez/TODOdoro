import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.js';
import { useCanvasStore } from './stores/useCanvasStore.js';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
} from '@tododoro/domain';

beforeEach(() => {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: true,
  });
});

describe('App', () => {
  it('renders ErrorBoundary wrapper even while booting', () => {
    const { container } = render(<App />);
    // ErrorBoundary is always mounted; Canvas children render nothing while booting
    expect(container.querySelector('.react-flow')).toBeNull();
  });

  it('renders the canvas after boot completes', () => {
    useCanvasStore.getState().bootstrap(
      INITIAL_TODO_LIST_STATE,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );

    const { container } = render(<App />);

    expect(container.querySelector('.react-flow')).not.toBeNull();
  });

  it('shows CanvasHint when canvas is empty after boot', () => {
    useCanvasStore.getState().bootstrap(
      INITIAL_TODO_LIST_STATE,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );

    render(<App />);

    expect(screen.getByText('Start with what calls to you')).not.toBeNull();
  });

  it('does not show CanvasHint when todos exist', () => {
    const todosWithItem = {
      items: [{ id: '1', title: 'Test', position: { x: 0, y: 0 }, pomodoroCount: 0, status: 'active' as const }],
      pendingSessions: new Map(),
    };

    useCanvasStore.getState().bootstrap(
      todosWithItem,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );

    render(<App />);

    expect(screen.queryByText('Start with what calls to you')).toBeNull();
  });

  it('renders the skip-to-canvas link', () => {
    render(<App />);
    const link = screen.getByText('Skip to canvas');
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('#main-canvas');
  });

  it('renders shelf icon button after boot', () => {
    useCanvasStore.getState().bootstrap(
      INITIAL_TODO_LIST_STATE,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );
    render(<App />);
    expect(screen.getByRole('button', { name: 'Open shelf' })).toBeTruthy();
  });

  it('renders settings icon button after boot', () => {
    useCanvasStore.getState().bootstrap(
      INITIAL_TODO_LIST_STATE,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );
    render(<App />);
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
  });

  it('canvas container has id main-canvas after boot', () => {
    useCanvasStore.getState().bootstrap(
      INITIAL_TODO_LIST_STATE,
      INITIAL_SHELF_STATE,
      INITIAL_DEVOTION_RECORD_STATE,
    );

    const { container } = render(<App />);
    expect(container.querySelector('#main-canvas')).not.toBeNull();
  });
});
