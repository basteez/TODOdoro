import { Component, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode, ErrorInfo, MouseEvent as ReactMouseEvent } from 'react';
import { CanvasHint, ConstellationCanvas, TodoCard, SkipLink, ShelfIcon, SettingsIcon } from '@tododoro/ui';
import type { TodoCardData } from '@tododoro/ui';
import type { Node, NodeTypes, OnNodesChange } from '@xyflow/react';
import { useReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react';
import { JsonEventStore } from '@tododoro/storage';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { handleDeclareTodo, handleRenameTodo, handlePositionTodo } from './commands/todoCommands.js';
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
  const [actionMenuNodeId, setActionMenuNodeId] = useState<string | null>(null);
  const dragDebounceRef = useRef<{ timeout: ReturnType<typeof setTimeout>; nodeId: string } | null>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({ todoCard: TodoCard }), []);

  // Auto-dismiss cap message after 2s
  useEffect(() => {
    if (!capMessage) return;
    const timer = setTimeout(() => setCapMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [capMessage]);

  // N shortcut: create card at canvas centre when no input is focused
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (todos.items.length >= 100) return;

      const { x, y, zoom } = reactFlow.getViewport();
      const centerX = (window.innerWidth / 2 - x) / zoom;
      const centerY = (window.innerHeight / 2 - y) / zoom;
      const position = { x: centerX, y: centerY };

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
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [todos.items.length, reactFlow]);

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
          isMenuOpen: actionMenuNodeId === item.id,
          onConfirm: () => {},
          onCancel: () => {},
          onMenuClose: () => setActionMenuNodeId(null),
          onRename: async (newTitle: string) => {
            const result = await handleRenameTodo(item.id, newTitle, eventStore, clock, idGenerator);
            if (!result.ok) {
              console.error('Failed to rename todo:', result.error);
            }
          },
        },
      })),
    [todos.items, actionMenuNodeId],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<TodoCardData>>(todoNodes);

  useEffect(() => {
    setFlowNodes(editingNode ? [...todoNodes, editingNode] : todoNodes);
  }, [todoNodes, editingNode, setFlowNodes]);

  const handleNodeDragStart = useCallback((_event: ReactMouseEvent, node: Node) => {
    if (dragDebounceRef.current !== null && dragDebounceRef.current.nodeId === node.id) {
      clearTimeout(dragDebounceRef.current.timeout);
      dragDebounceRef.current = null;
    }
  }, []);

  const handleNodeDragStop = useCallback((_event: ReactMouseEvent, node: Node) => {
    if (dragDebounceRef.current !== null) {
      clearTimeout(dragDebounceRef.current.timeout);
    }
    dragDebounceRef.current = {
      timeout: setTimeout(async () => {
        dragDebounceRef.current = null;
        const result = await handlePositionTodo(node.id, node.position, eventStore, clock, idGenerator);
        if (!result.ok) {
          console.error('Failed to position todo:', result.error);
        }
      }, 200),
      nodeId: node.id,
    };
  }, []);

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

  // Enter key on focused React Flow node opens its action menu
  const handleCanvasKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl) return;
    const nodeEl = activeEl.closest('.react-flow__node') as HTMLElement | null;
    if (!nodeEl) return;
    const nodeId = nodeEl.getAttribute('data-id');
    if (nodeId && nodeId !== EDITING_NODE_ID) {
      setActionMenuNodeId(nodeId);
    }
  }, []);

  if (isBooting) {
    return null;
  }

  return (
    <div id="main-canvas" tabIndex={-1} className="relative w-full h-full">
      <ConstellationCanvas
        nodes={flowNodes}
        nodeTypes={nodeTypes}
        onDoubleClick={handleDoubleClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={onNodesChange as OnNodesChange}
        onKeyDown={handleCanvasKeyDown}
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
      <SkipLink />
      <Canvas />
      <ShelfIcon />
      <SettingsIcon />
    </ErrorBoundary>
  );
}
