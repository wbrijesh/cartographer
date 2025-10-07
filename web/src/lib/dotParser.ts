import dagre from 'dagre';

interface Node {
  id: string;
  data: {
    label: string;
    tooltip: string;
  };
  position: { x: number; y: number };
  type: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  callGraph: Map<string, string[]>; // node -> callees
  reverseCallGraph: Map<string, string[]>; // node -> callers
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 25,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function parseDOT(dotContent: string): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const processedNodes = new Set<string>();
  const callGraph = new Map<string, string[]>();
  const reverseCallGraph = new Map<string, string[]>();
  
  // Extract node definitions with tooltips
  const nodeWithTooltipRegex = /"([^"]+)"\s*\[tooltip="([^"]*)"\];/g;
  let nodeMatch;
  
  while ((nodeMatch = nodeWithTooltipRegex.exec(dotContent)) !== null) {
    const [, id, tooltip] = nodeMatch;
    nodes.push({
      id,
      data: { 
        label: id,
        tooltip: tooltip || ''
      },
      position: { x: 0, y: 0 },
      type: 'custom'
    });
    processedNodes.add(id);
  }
  
  // Extract node definitions without tooltips
  const nodeWithoutTooltipRegex = /"([^"]+)";/g;
  let simpleNodeMatch;
  
  while ((simpleNodeMatch = nodeWithoutTooltipRegex.exec(dotContent)) !== null) {
    const [, id] = simpleNodeMatch;
    if (!processedNodes.has(id)) {
      nodes.push({
        id,
        data: { 
          label: id,
          tooltip: ''
        },
        position: { x: 0, y: 0 },
        type: 'custom'
      });
      processedNodes.add(id);
    }
  }
  
  // Extract edge definitions and build call graphs
  const edgeRegex = /"([^"]+)"\s*->\s*"([^"]+)";/g;
  let edgeMatch;
  let edgeId = 0;
  
  while ((edgeMatch = edgeRegex.exec(dotContent)) !== null) {
    const [, source, target] = edgeMatch;
    edges.push({
      id: `edge-${edgeId++}`,
      source,
      target,
      type: 'smoothstep'
    });
    
    // Build call graph (source calls target)
    if (!callGraph.has(source)) {
      callGraph.set(source, []);
    }
    callGraph.get(source)!.push(target);
    
    // Build reverse call graph (target is called by source)
    if (!reverseCallGraph.has(target)) {
      reverseCallGraph.set(target, []);
    }
    reverseCallGraph.get(target)!.push(source);
  }
  
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
  
  return { 
    nodes: layoutedNodes, 
    edges: layoutedEdges,
    callGraph,
    reverseCallGraph
  };
}
