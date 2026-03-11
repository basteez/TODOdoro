import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Node, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const defaultNodes: Node[] = [];
const emptyEdges: never[] = [];

interface ConstellationCanvasProps {
  nodes?: Node[];
  nodeTypes?: NodeTypes;
  onDoubleClick?: (event: React.MouseEvent) => void;
}

export function ConstellationCanvas({
  nodes = defaultNodes,
  nodeTypes,
  onDoubleClick,
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
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
