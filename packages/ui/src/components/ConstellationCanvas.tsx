import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const emptyNodes: never[] = [];
const emptyEdges: never[] = [];

export function ConstellationCanvas() {
  return (
    <ReactFlow
      nodes={emptyNodes}
      edges={emptyEdges}
      fitView
      panOnDrag
      zoomOnScroll
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
