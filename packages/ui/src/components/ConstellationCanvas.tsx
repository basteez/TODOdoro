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
}

export function ConstellationCanvas({
  nodes = defaultNodes,
  nodeTypes,
  onDoubleClick,
  onNodeDragStart,
  onNodeDragStop,
  onNodesChange,
}: ConstellationCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={emptyEdges}
      {...(nodeTypes ? { nodeTypes } : {})}
      fitView
      panOnDrag
      zoomOnScroll
      zoomOnDoubleClick={false}
      onDoubleClick={onDoubleClick}
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
