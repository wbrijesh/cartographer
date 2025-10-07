import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';

interface CustomNodeData {
  label: string;
  tooltip: string;
  isDark?: boolean;
  isHighlighted?: boolean;
  highlightType?: 'upstream' | 'downstream' | 'selected' | null;
}

export default function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasExplanation = data.tooltip && data.tooltip.trim().length > 0;
  const isDark = data.isDark || false;
  const isHighlighted = data.isHighlighted || false;
  const highlightType = data.highlightType;

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  // Get node styling based on highlight state
  const getNodeStyling = () => {
    if (!isHighlighted) {
      return isDark 
        ? 'bg-neutral-800 border-neutral-600 text-white opacity-50' 
        : 'bg-white border-neutral-300 text-neutral-800 opacity-50';
    }

    switch (highlightType) {
      case 'selected':
        return 'bg-blue-100 border-blue-500 text-blue-900 ring-2 ring-blue-300';
      case 'upstream':
        return 'bg-green-100 border-green-500 text-green-900';
      case 'downstream':
        return 'bg-red-100 border-red-500 text-red-900';
      default:
        return isDark 
          ? 'bg-neutral-800 border-neutral-600 text-white' 
          : 'bg-white border-neutral-300 text-neutral-800';
    }
  };

  return (
    <div className="relative">
      <div className={`px-3 py-2 border-2 rounded-lg shadow-sm hover:shadow-md transition-all ${getNodeStyling()}`}>
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono">
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
        <div className={`absolute z-[9999] p-3 text-sm rounded-lg shadow-lg max-w-xs -top-2 left-full ml-2 ${
          isDark 
            ? 'bg-neutral-700 text-neutral-100' 
            : 'bg-neutral-900 text-white'
        }`}>
          <div className={`absolute -left-1 top-3 w-2 h-2 rotate-45 ${
            isDark ? 'bg-neutral-700' : 'bg-neutral-900'
          }`}></div>
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
