import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { ConstellationCanvas } from '@tododoro/ui';
import { useCanvasStore } from './stores/useCanvasStore.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Last-resort boundary — domain errors are returned as values, never thrown
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-text-primary">
          <h1>Something went wrong</h1>
          <p>Try clearing your browser data and reloading.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Canvas() {
  const isBooting = useCanvasStore((s) => s.isBooting);

  if (isBooting) {
    return null;
  }

  return <ConstellationCanvas />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Canvas />
    </ErrorBoundary>
  );
}
