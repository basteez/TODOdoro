import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
});
