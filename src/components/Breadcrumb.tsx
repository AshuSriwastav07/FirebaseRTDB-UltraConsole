import React, { useState } from 'react';
import { ChevronRight, Copy, Check, Code, Home } from 'lucide-react';
import { NodePath } from '../types/json';
import { pathToString, getType } from '../utils/jsonOperations';
import { getTypeBadgeInfo } from '../utils/typeDetection';

interface BreadcrumbProps {
  selectedPath: NodePath;
  selectedNodeValue: any;
  onSelectPath: (path: NodePath) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  selectedPath,
  selectedNodeValue,
  onSelectPath,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const selectedType = getType(selectedNodeValue);
  const typeBadge = getTypeBadgeInfo(selectedType);

  const handleCopyPath = () => {
    const pStr = selectedPath.length === 0 ? 'root' : selectedPath.join('/');
    navigator.clipboard.writeText(pStr);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(selectedNodeValue, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="bg-firebase-dark border-b border-firebase-border px-4 py-2 flex items-center justify-between gap-4 font-mono text-xs overflow-x-auto selection:bg-firebase-blue">
      {/* Path Breadcrumb segments */}
      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto py-0.5">
        <button
          onClick={() => onSelectPath([])}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            selectedPath.length === 0
              ? 'bg-firebase-subtleBlue text-firebase-blue font-bold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-firebase-card'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>root</span>
        </button>

        {selectedPath.map((segment, index) => {
          const subPath = selectedPath.slice(0, index + 1);
          const isLast = index === selectedPath.length - 1;

          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <button
                onClick={() => onSelectPath(subPath)}
                className={`px-2 py-1 rounded transition-colors truncate max-w-[160px] ${
                  isLast
                    ? 'bg-firebase-subtleBlue text-firebase-blue font-bold border border-firebase-blue/30'
                    : 'text-slate-300 hover:text-white hover:bg-firebase-card'
                }`}
                title={pathToString(subPath)}
              >
                {segment}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Path Meta Badges & Copy Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Type Badge */}
        <span
          className={`px-2 py-0.5 text-[11px] font-semibold border rounded ${typeBadge.color}`}
        >
          {typeBadge.label}
        </span>

        {/* Copy Path Button */}
        <button
          onClick={handleCopyPath}
          className="flex items-center gap-1 px-2 py-1 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded text-[11px] transition"
          title="Copy exact node path to clipboard"
        >
          {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copiedPath ? 'Path Copied' : 'Copy Path'}</span>
        </button>

        {/* Copy JSON Button */}
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1 px-2 py-1 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded text-[11px] transition"
          title="Copy node value as JSON string"
        >
          {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-purple-400" />}
          <span>{copiedJson ? 'JSON Copied' : 'Copy JSON'}</span>
        </button>
      </div>
    </div>
  );
};
