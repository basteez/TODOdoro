import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Node, NodeTypes, NodeMouseHandler, OnNodesChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const defaultNodes: Node[] = [];
const emptyEdges: never[] = [];

interface ConstellationCanvasProps {
  nodes?: Node[];
  nodeTypes?: NodeTypes;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onNodeDragStart?: NodeMouseHandler;
  onNodeDragStop?: NodeMouseHandler;
  onNodesChange?: OnNodesChange;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

export function ConstellationCanvas({
  nodes = defaultNodes,
  nodeTypes,
  onDoubleClick,
  onNodeDragStart,
  onNodeDragStop,
  onNodesChange,
  onKeyDown,
}: ConstellationCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={emptyEdges}
      {...(nodeTypes ? { nodeTypes } : {})}
      fitView
      panOnDrag={[0, 1, 2]}
      zoomOnScroll
      zoomOnDoubleClick={false}
      minZoom={0.1}
      maxZoom={4}
      nodesFocusable
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      {...(onNodesChange ? { onNodesChange } : {})}
      {...(onNodeDragStart ? { onNodeDragStart } : {})}
      {...(onNodeDragStop ? { onNodeDragStop } : {})}
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
