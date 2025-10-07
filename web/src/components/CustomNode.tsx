import { Handle, Position, NodeProps } from 'reactflow';
import { useState } from 'react';

interface CustomNodeData {
  label: string;
  tooltip: string;
}

export default function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasExplanation = data.tooltip && data.tooltip.trim().length > 0;

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  return (
    <div className="relative">
      <div className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono text-gray-800">
            {data.label}
          </div>
          {hasExplanation && (
            <button
              onClick={toggleTooltip}
              className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center hover:bg-blue-600 transition-colors"
              title="Click for explanation"
            >
              i
            </button>
          )}
        </div>
      </div>
      
      {showTooltip && hasExplanation && (
        <div className="absolute z-[9999] p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs -top-2 left-full ml-2">
          <div className="absolute -left-1 top-3 w-2 h-2 bg-gray-900 rotate-45"></div>
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
          >
            ×
          </button>
          {data.tooltip}
        </div>
      )}
      
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}
