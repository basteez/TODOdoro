import { Component, useMemo, useState, useCallback, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { CanvasHint, ConstellationCanvas, TodoCard } from '@tododoro/ui';
import type { TodoCardData } from '@tododoro/ui';
import type { Node, NodeTypes } from '@xyflow/react';
import { useReactFlow, ReactFlowProvider } from '@xyflow/react';
import { JsonEventStore } from '@tododoro/storage';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { handleDeclareTodo, handleRenameTodo } from './commands/todoCommands.js';
import { SystemClock } from './adapters/SystemClock.js';
import { CryptoIdGenerator } from './adapters/CryptoIdGenerator.js';

const eventStore = new JsonEventStore();
const clock = new SystemClock();
const idGenerator = new CryptoIdGenerator();

const EDITING_NODE_ID = '__editing__';

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

function CanvasInner() {
  const isBooting = useCanvasStore((s) => s.isBooting);
  const todos = useCanvasStore((s) => s.todos);
  const isEmpty = todos.items.length === 0;
  const reactFlow = useReactFlow();

  const [editingNode, setEditingNode] = useState<Node<TodoCardData> | null>(null);
  const [capMessage, setCapMessage] = useState<{ x: number; y: number } | null>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({ todoCard: TodoCard }), []);

  // Auto-dismiss cap message after 2s
  useEffect(() => {
    if (!capMessage) return;
    const timer = setTimeout(() => setCapMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [capMessage]);

  // Map store todos → React Flow nodes
  const todoNodes: Node<TodoCardData>[] = useMemo(
    () =>
      todos.items.map((item) => ({
        id: item.id,
        type: 'todoCard',
        position: { x: item.position.x, y: item.position.y },
        data: {
          title: item.title,
          todoId: item.id,
          sessionsCount: item.pomodoroCount,
          isEditing: false,
          onConfirm: () => {},
          onCancel: () => {},
          onRename: async (newTitle: string) => {
            const result = await handleRenameTodo(item.id, newTitle, eventStore, clock, idGenerator);
            if (!result.ok) {
              console.error('Failed to rename todo:', result.error);
            }
          },
        },
      })),
    [todos.items],
  );

  const nodes: Node<TodoCardData>[] = editingNode
    ? [...todoNodes, editingNode]
    : todoNodes;

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // M2 fix: Only create cards when double-clicking the pane, not existing nodes
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) {
        return;
      }

      // Enforce 100-card cap at the UI level (belt)
      if (todos.items.length >= 100) {
        setCapMessage({ x: event.clientX, y: event.clientY });
        return;
      }

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const onConfirm = async (title: string) => {
        setEditingNode(null);
        const result = await handleDeclareTodo(title, position, eventStore, clock, idGenerator);
        if (!result.ok) {
          console.error('Failed to declare todo:', result.error);
        }
      };

      const onCancel = () => {
        setEditingNode(null);
      };

      setEditingNode({
        id: EDITING_NODE_ID,
        type: 'todoCard',
        position,
        data: {
          title: '',
          todoId: '',
          sessionsCount: 0,
          isEditing: true,
          onConfirm,
          onCancel,
          onRename: () => {},
        },
      });
    },
    [todos.items.length, reactFlow],
  );

  if (isBooting) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      <ConstellationCanvas
        nodes={nodes}
        nodeTypes={nodeTypes}
        onDoubleClick={handleDoubleClick}
      />
      <CanvasHint isEmpty={isEmpty && editingNode === null} />
      {capMessage && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded text-xs"
          style={{
            left: capMessage.x,
            top: capMessage.y - 40,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-secondary)',
          }}
        >
          Canvas is full — 100 cards maximum
        </div>
      )}
    </div>
  );
}

function Canvas() {
  const isBooting = useCanvasStore((s) => s.isBooting);

  if (isBooting) {
    return null;
  }

  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Canvas />
    </ErrorBoundary>
  );
}
