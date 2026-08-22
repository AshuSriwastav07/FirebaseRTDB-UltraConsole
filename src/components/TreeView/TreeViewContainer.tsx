import React, { useState } from 'react';
import { Database, Upload, FileCode } from 'lucide-react';
import { NodePath, SearchMatch } from '../../types/json';
import { TreeNode } from './TreeNode';
import { getType } from '../../utils/jsonOperations';

interface TreeViewContainerProps {
  data: any;
  fileName: string;
  selectedPath: NodePath;
  expandedPaths: Set<string>;
  searchResults: SearchMatch[];
  searchQuery: string;
  onSelectNode: (path: NodePath) => void;
  onToggleExpand: (path: NodePath) => void;
  onAddChildClick: (path: NodePath) => void;
  onEditClick: (path: NodePath) => void;
  onDeleteClick: (path: NodePath) => void;
  onImportJson: (data: any, fileName: string) => void;
}

export const TreeViewContainer: React.FC<TreeViewContainerProps> = ({
  data,
  fileName,
  selectedPath,
  expandedPaths,
  searchResults,
  searchQuery,
  onSelectNode,
  onToggleExpand,
  onAddChildClick,
  onEditClick,
  onDeleteClick,
  onImportJson,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onImportJson(parsed, file.name);
        } catch (err: any) {
          alert('Invalid JSON file dropped: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const rootType = getType(data);
  const rootChildCount =
    rootType === 'object'
      ? Object.keys(data || {}).length
      : rootType === 'array'
      ? (data || []).length
      : 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col bg-firebase-dark overflow-hidden relative border-r border-firebase-border ${
        isDragOver ? 'ring-2 ring-firebase-blue bg-firebase-subtleBlue/20' : ''
      }`}
    >
      {/* Drag overlay notice */}
      {isDragOver && (
        <div className="absolute inset-0 bg-firebase-dark/90 z-40 flex flex-col items-center justify-center text-firebase-blue font-mono gap-3 backdrop-blur-sm">
          <Upload className="w-12 h-12 animate-bounce text-firebase-blue" />
          <span className="text-base font-semibold">Drop JSON File Here to Load</span>
        </div>
      )}

      {/* Tree Panel Header */}
      <div className="bg-firebase-panel border-b border-firebase-border px-4 py-2 flex items-center justify-between font-mono text-xs select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200">Database Tree</span>
          <span className="text-[11px] text-slate-500 font-normal">
            (https://local-json-db.firebaseio.com)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>{rootChildCount} root {rootChildCount === 1 ? 'node' : 'nodes'}</span>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-firebase-border">
        {data === undefined || data === null || (rootType === 'object' && rootChildCount === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs font-mono gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-firebase-card flex items-center justify-center border border-firebase-border">
              <Database className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-200 text-sm">Database is currently empty</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Add keys and values using the panel on the right, or import a JSON file.
              </p>
            </div>
            <button
              onClick={() => onSelectNode([])}
              className="px-4 py-2 bg-firebase-blue hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition text-xs shadow-md"
            >
              + Add First Key / Node
            </button>
          </div>
        ) : (
          <TreeNode
            keyName="root"
            value={data}
            path={[]}
            depth={0}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            searchResults={searchResults}
            searchQuery={searchQuery}
            onSelectNode={onSelectNode}
            onToggleExpand={onToggleExpand}
            onAddChildClick={onAddChildClick}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
          />
        )}
      </div>
    </div>
  );
};
