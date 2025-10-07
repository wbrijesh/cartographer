import { Handle, Position, NodeProps } from 'reactflow';
import { useState } from 'react';

interface CustomNodeData {
  label: string;
  tooltip: string;
}

export default function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="text-sm font-mono text-gray-800">
          {data.label}
        </div>
      </div>
      
      {showTooltip && data.tooltip && (
        <div className="absolute z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs -top-2 left-full ml-2">
          <div className="absolute -left-1 top-3 w-2 h-2 bg-gray-900 rotate-45"></div>
          {data.tooltip}
        </div>
      )}
      
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}
