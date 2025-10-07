import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type ColorMode,
  type OnNodeClick,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface GraphVisualizationProps {
  nodes: Node[];
  edges: Edge[];
  isDark: boolean;
  isHighlightMode: boolean;
  callGraph: Map<string, string[]>;
  reverseCallGraph: Map<string, string[]>;
}

export default function GraphVisualization({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  isDark,
  isHighlightMode,
  callGraph,
  reverseCallGraph
}: GraphVisualizationProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const colorMode: ColorMode = isDark ? 'dark' : 'light';

  // Get highlighted nodes and edges
  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    if (!isHighlightMode || !selectedNodeId) {
      return { highlightedNodes: new Map(), highlightedEdges: new Map() };
    }

    const upstreamNodes = new Set<string>();
    const downstreamNodes = new Set<string>();
    const upstreamEdges = new Set<string>();
    const downstreamEdges = new Set<string>();

    // Get immediate callers (upstream)
    const callers = reverseCallGraph.get(selectedNodeId) || [];
    callers.forEach(caller => {
      upstreamNodes.add(caller);
      // Find edge from caller to selected node
      const edge = initialEdges.find(e => e.source === caller && e.target === selectedNodeId);
      if (edge) upstreamEdges.add(edge.id);
    });

    // Get immediate callees (downstream)
    const callees = callGraph.get(selectedNodeId) || [];
    callees.forEach(callee => {
      downstreamNodes.add(callee);
      // Find edge from selected node to callee
      const edge = initialEdges.find(e => e.source === selectedNodeId && e.target === callee);
      if (edge) downstreamEdges.add(edge.id);
    });

    return {
      highlightedNodes: new Map([
        ...Array.from(upstreamNodes).map(id => [id, 'upstream'] as const),
        ...Array.from(downstreamNodes).map(id => [id, 'downstream'] as const),
        [selectedNodeId, 'selected'] as const
      ]),
      highlightedEdges: new Map([
        ...Array.from(upstreamEdges).map(id => [id, 'upstream'] as const),
        ...Array.from(downstreamEdges).map(id => [id, 'downstream'] as const)
      ])
    };
  }, [isHighlightMode, selectedNodeId, callGraph, reverseCallGraph, initialEdges]);

  // Update node styles based on highlighting
  const styledNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: highlightedNodes.has(node.id),
        highlightType: highlightedNodes.get(node.id) || null,
        isDark,
        openTooltipId,
        setOpenTooltipId
      }
    }));
  }, [nodes, highlightedNodes, isDark, openTooltipId]);

  // Update edge styles based on highlighting
  const styledEdges = useMemo(() => {
    return edges.map(edge => {
      const highlightType = highlightedEdges.get(edge.id);
      return {
        ...edge,
        style: highlightType ? {
          stroke: highlightType === 'upstream' ? '#10b981' : '#ef4444', // green for upstream, red for downstream
          strokeWidth: 3,
        } : {
          stroke: isDark ? '#6b7280' : '#9ca3af',
          strokeWidth: 1,
        }
      };
    });
  }, [edges, highlightedEdges, isDark]);

  const onNodeClick: OnNodeClick = useCallback((event, node) => {
    if (isHighlightMode) {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [isHighlightMode, selectedNodeId]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        colorMode={colorMode}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
