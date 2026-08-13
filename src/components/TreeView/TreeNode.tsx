import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Code,
  Folder,
  FolderOpen,
  List,
  Check
} from 'lucide-react';
import { NodePath, SearchMatch } from '../../types/json';
import { getType, isPathEqual, pathToString } from '../../utils/jsonOperations';

interface TreeNodeProps {
  keyName: string;
  value: any;
  path: NodePath;
  depth: number;
  selectedPath: NodePath;
  expandedPaths: Set<string>;
  searchResults: SearchMatch[];
  searchQuery: string;
  onSelectNode: (path: NodePath) => void;
  onToggleExpand: (path: NodePath) => void;
  onAddChildClick: (path: NodePath) => void;
  onEditClick: (path: NodePath) => void;
  onDeleteClick: (path: NodePath) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  keyName,
  value,
  path,
  depth,
  selectedPath,
  expandedPaths,
  searchResults,
  searchQuery,
  onSelectNode,
  onToggleExpand,
  onAddChildClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [copied, setCopied] = useState(false);
  const pathStr = pathToString(path);
  const isExpanded = expandedPaths.has(pathStr);
  const isSelected = isPathEqual(selectedPath, path);
  const valType = getType(value);

  const isObject = valType === 'object';
  const isArray = valType === 'array';
  const isExpandable = isObject || isArray;

  // Search match check
  const isSearchMatched = searchQuery.trim() !== '' && searchResults.some(m => isPathEqual(m.path, path));

  const childCount = isObject
    ? Object.keys(value || {}).length
    : isArray
    ? (value || []).length
    : 0;

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pStr = path.length === 0 ? 'root' : path.join('/');
    navigator.clipboard.writeText(pStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="select-none font-mono text-xs">
      {/* Node row line */}
      <div
        onClick={() => onSelectNode(path)}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors relative border-l-2 ${
          isSelected
            ? 'bg-firebase-subtleBlue/60 border-firebase-blue text-white shadow-sm'
            : isSearchMatched
            ? 'bg-amber-500/10 border-amber-500/80 text-amber-300'
            : 'border-transparent hover:bg-firebase-hover text-slate-300'
        }`}
        style={{ paddingLeft: `${Math.max(8, depth * 18 + 8)}px` }}
      >
        {/* Left: Arrow, Icon, Key, Value */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Arrow expand toggle */}
          {isExpandable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(path);
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-firebase-card/60"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          ) : (
            <span className="w-4 h-4 inline-block shrink-0" />
          )}

          {/* Type Icon */}
          {isObject && (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )
          )}
          {isArray && <List className="w-3.5 h-3.5 text-amber-400 shrink-0" />}

          {/* Key name */}
          <span
            className={`font-semibold shrink-0 ${
              isSearchMatched ? 'text-amber-300 bg-amber-500/20 px-1 rounded' : 'text-slate-200'
            }`}
          >
            {keyName}
          </span>
          <span className="text-slate-500 shrink-0">:</span>

          {/* Value display */}
          {isExpandable ? (
            <span className="text-slate-500 text-[11px] font-normal truncate">
              {isObject ? `{ ${childCount} ${childCount === 1 ? 'entry' : 'entries'} }` : `[ ${childCount} items ]`}
            </span>
          ) : (
            <span className="truncate">
              {valType === 'string' && (
                <span className="text-emerald-400 font-normal">"{String(value)}"</span>
              )}
              {valType === 'number' && (
                <span className="text-sky-400 font-bold">{String(value)}</span>
              )}
              {valType === 'boolean' && (
                <span className="text-purple-400 font-bold">{String(value)}</span>
              )}
              {valType === 'null' && (
                <span className="text-slate-500 italic font-semibold">null</span>
              )}
            </span>
          )}
        </div>

        {/* Right: Hover Action Toolbar (Firebase RTDB style) */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 ml-2 transition-opacity">
          {/* Add Child (if expandable or primitive target) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChildClick(path);
            }}
            className="p-1 bg-firebase-card hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 rounded border border-firebase-border"
            title="Add Child Key under this node (+)"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Edit Node */}
          {path.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(path);
              }}
              className="p-1 bg-firebase-card hover:bg-sky-600/30 text-sky-400 hover:text-sky-300 rounded border border-firebase-border"
              title="Edit Node Value / Key Name (✏️)"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Delete Node */}
          {path.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(path);
              }}
              className="p-1 bg-firebase-card hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 rounded border border-firebase-border"
              title="Delete Node (🗑️)"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {/* Copy Path */}
          <button
            onClick={handleCopyPath}
            className="p-1 bg-firebase-card hover:bg-firebase-hover text-slate-400 hover:text-slate-200 rounded border border-firebase-border"
            title="Copy Node Path"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          {/* Copy JSON */}
          <button
            onClick={handleCopyJson}
            className="p-1 bg-firebase-card hover:bg-firebase-hover text-slate-400 hover:text-slate-200 rounded border border-firebase-border"
            title="Copy Node Value as JSON"
          >
            <Code className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Render children if expandable and expanded */}
      {isExpandable && isExpanded && (
        <div className="flex flex-col">
          {isObject &&
            Object.keys(value || {}).map((childKey) => (
              <TreeNode
                key={childKey}
                keyName={childKey}
                value={value[childKey]}
                path={[...path, childKey]}
                depth={depth + 1}
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
            ))}

          {isArray &&
            (value || []).map((item: any, idx: number) => (
              <TreeNode
                key={idx}
                keyName={String(idx)}
                value={item}
                path={[...path, idx]}
                depth={depth + 1}
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
            ))}
        </div>
      )}
    </div>
  );
};
