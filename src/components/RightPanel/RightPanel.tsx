import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Check,
  Info,
  Layers,
  ChevronRight,
  ShieldAlert,
  Code
} from 'lucide-react';
import { DataType, NodePath } from '../../types/json';
import { detectType, coerceType, getTypeBadgeInfo } from '../../utils/typeDetection';
import { getType, pathToString, getValueByPath } from '../../utils/jsonOperations';

interface RightPanelProps {
  rootData: any;
  selectedPath: NodePath;
  onAddChild: (path: NodePath, key: string, value: any) => void;
  onUpdateValue: (path: NodePath, newValue: any) => void;
  onRenameKey: (parentPath: NodePath, oldKey: string, newKey: string) => void;
  onDeleteNode: (path: NodePath) => void;
  onOpenValidator?: (initialContent?: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  rootData,
  selectedPath,
  onAddChild,
  onUpdateValue,
  onRenameKey,
  onDeleteNode,
  onOpenValidator,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'edit'>('add');

  // Add Child Form State
  const [addKeyInput, setAddKeyInput] = useState('');
  const [addValueInput, setAddValueInput] = useState('');
  const [addTypeOverride, setAddTypeOverride] = useState<DataType | 'auto'>('auto');

  // Edit Form State
  const [editKeyInput, setEditKeyInput] = useState('');
  const [editValueInput, setEditValueInput] = useState('');
  const [editTypeOverride, setEditTypeOverride] = useState<DataType | 'auto'>('auto');

  // Confirm delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nodeValue = useMemo(() => {
    return getValueByPath(rootData, selectedPath);
  }, [rootData, selectedPath]);

  const nodeType = getType(nodeValue);
  const isArrayNode = nodeType === 'array';
  const isObjectNode = nodeType === 'object';
  const isPrimitiveNode = !isArrayNode && !isObjectNode;

  const nodeKeyName = selectedPath.length > 0 ? String(selectedPath[selectedPath.length - 1]) : 'root';
  const parentPath = selectedPath.slice(0, -1);
  const parentValue = getValueByPath(rootData, parentPath);
  const isParentArray = Array.isArray(parentValue);

  // Auto-suggest next array index for key input if selected node is an array
  useEffect(() => {
    if (isArrayNode && Array.isArray(nodeValue)) {
      setAddKeyInput(String(nodeValue.length));
    } else {
      setAddKeyInput('');
    }
    setAddValueInput('');
    setAddTypeOverride('auto');
  }, [selectedPath, isArrayNode, nodeValue]);

  // Sync edit form inputs when selected node changes
  useEffect(() => {
    setEditKeyInput(nodeKeyName);
    if (isPrimitiveNode) {
      setEditValueInput(nodeValue === null ? 'null' : String(nodeValue));
    } else {
      setEditValueInput(JSON.stringify(nodeValue, null, 2));
    }
    setEditTypeOverride('auto');
    setShowDeleteConfirm(false);
  }, [selectedPath, nodeValue, nodeKeyName, isPrimitiveNode]);

  // Type detection for ADD input
  const addDetected = useMemo(() => {
    const auto = detectType(addValueInput);
    if (addTypeOverride === 'auto') return auto;
    const coerced = coerceType(addValueInput, addTypeOverride);
    return {
      type: addTypeOverride,
      parsedValue: coerced.parsedValue,
      isInvalidJsonSyntax: !coerced.isValid,
      warningMessage: coerced.error,
      rawInput: addValueInput,
    };
  }, [addValueInput, addTypeOverride]);

  // Type detection for EDIT input
  const editDetected = useMemo(() => {
    const auto = detectType(editValueInput);
    if (editTypeOverride === 'auto') return auto;
    const coerced = coerceType(editValueInput, editTypeOverride);
    return {
      type: editTypeOverride,
      parsedValue: coerced.parsedValue,
      isInvalidJsonSyntax: !coerced.isValid,
      warningMessage: coerced.error,
      rawInput: editValueInput,
    };
  }, [editValueInput, editTypeOverride]);

  // Duplicate key check for Add form
  const isDuplicateAddKey = useMemo(() => {
    if (!isObjectNode || !addKeyInput.trim()) return false;
    return Object.prototype.hasOwnProperty.call(nodeValue || {}, addKeyInput.trim());
  }, [isObjectNode, nodeValue, addKeyInput]);

  // Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyToUse = isArrayNode ? String(Array.isArray(nodeValue) ? nodeValue.length : 0) : addKeyInput.trim();

    if (!isArrayNode && !keyToUse) {
      alert('Key name is required when adding a child to an object.');
      return;
    }

    if (addDetected.isInvalidJsonSyntax) {
      const confirmProceed = window.confirm(
        'Warning: The value appears to have invalid JSON syntax. Do you want to store it as a plain string instead?'
      );
      if (!confirmProceed) return;
    }

    const valueToInsert = addDetected.isInvalidJsonSyntax ? addValueInput : addDetected.parsedValue;

    onAddChild(selectedPath, keyToUse, valueToInsert);

    // Reset value input
    setAddValueInput('');
    setAddTypeOverride('auto');
    if (isArrayNode && Array.isArray(nodeValue)) {
      setAddKeyInput(String(nodeValue.length + 1));
    } else {
      setAddKeyInput('');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPath.length === 0) return; // Cannot edit root key

    // Key rename handling if parent is object
    if (!isParentArray && editKeyInput.trim() && editKeyInput.trim() !== nodeKeyName) {
      onRenameKey(parentPath, nodeKeyName, editKeyInput.trim());
    }

    if (editDetected.isInvalidJsonSyntax) {
      const confirmProceed = window.confirm(
        'Warning: Value has invalid JSON syntax. Store as plain string?'
      );
      if (!confirmProceed) return;
    }

    const finalVal = editDetected.isInvalidJsonSyntax ? editValueInput : editDetected.parsedValue;
    onUpdateValue(selectedPath, finalVal);
  };

  const addBadgeInfo = getTypeBadgeInfo(addDetected.type);
  const editBadgeInfo = getTypeBadgeInfo(editDetected.type);
  const currentBadgeInfo = getTypeBadgeInfo(nodeType);

  return (
    <aside className="w-80 sm:w-96 bg-firebase-panel border-l border-firebase-border flex flex-col h-full font-sans overflow-hidden select-none selection:bg-firebase-blue">
      {/* Right Panel Header */}
      <div className="p-4 border-b border-firebase-border bg-firebase-card/40 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 truncate">
            <Layers className="w-4 h-4 text-firebase-blue shrink-0" />
            <span className="truncate font-semibold text-slate-200">{pathToString(selectedPath)}</span>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${currentBadgeInfo.color}`}>
            {currentBadgeInfo.label}
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-firebase-card p-0.5 rounded-lg border border-firebase-border mt-1">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
              activeTab === 'add'
                ? 'bg-firebase-blue text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Child</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            disabled={selectedPath.length === 0}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition disabled:opacity-40 ${
              activeTab === 'edit'
                ? 'bg-firebase-blue text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Node</span>
          </button>
        </div>
      </div>

      {/* Main Form Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* ADD CHILD TAB */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs">Add New Child Node</span>
              <span className="text-[10px] text-slate-500 font-sans">100% Auto Type-Detected</span>
            </div>

            {/* Key Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Key Name {isArrayNode && <span className="text-amber-400 font-normal">(Auto-Indexed Array)</span>}
              </label>
              <input
                type="text"
                value={addKeyInput}
                onChange={(e) => setAddKeyInput(e.target.value)}
                placeholder={isArrayNode ? `Index #${nodeValue?.length ?? 0}` : 'e.g. username, age, isActive'}
                readOnly={isArrayNode}
                className={`w-full bg-firebase-card border rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition ${
                  isDuplicateAddKey
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-firebase-border focus:border-firebase-blue'
                } ${isArrayNode ? 'bg-firebase-dark/60 text-slate-400 cursor-not-allowed' : ''}`}
              />
              {isDuplicateAddKey && (
                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Key already exists in this object (will overwrite)
                </p>
              )}
            </div>

            {/* Value Field (Single Plain Text Input) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Value <span className="text-slate-500 font-normal">(Plain Text Input)</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Override:</span>
                  <select
                    value={addTypeOverride}
                    onChange={(e) => setAddTypeOverride(e.target.value as any)}
                    className="bg-firebase-card border border-firebase-border text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="null">Null</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                value={addValueInput}
                onChange={(e) => setAddValueInput(e.target.value)}
                placeholder='Type anything: John, 27, true, null, [1,2], {"city":"Delhi"}'
                className="w-full bg-firebase-card border border-firebase-border rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-firebase-blue transition font-mono resize-y"
              />
            </div>

            {/* Live Auto-Detection Preview Card */}
            <div className="bg-firebase-dark/80 rounded-lg p-3 border border-firebase-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-sans">Detected Type:</span>
                <span className={`px-2 py-0.5 font-bold border rounded ${addBadgeInfo.color}`}>
                  {addBadgeInfo.label} ✅
                </span>
              </div>

              {/* Syntax Warning Banner */}
              {addDetected.isInvalidJsonSyntax && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-[11px] text-rose-300 flex flex-col gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{addDetected.warningMessage}</span>
                  </div>
                  {onOpenValidator && (
                    <button
                      type="button"
                      onClick={() => onOpenValidator(addValueInput)}
                      className="self-end px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded text-[10px] font-sans font-semibold transition"
                    >
                      🔍 Inspect & Fix Error on Site
                    </button>
                  )}
                </div>
              )}

              {/* Live Parsed Preview */}
              <div className="text-[10px] text-slate-400 space-y-1">
                <span className="font-sans font-semibold">Parsed Storage Value:</span>
                <div className="bg-firebase-card p-2 rounded border border-firebase-border max-h-24 overflow-auto text-slate-300">
                  {addDetected.type === 'string' && `"${addDetected.parsedValue}"`}
                  {addDetected.type === 'number' && <span className="text-sky-400">{String(addDetected.parsedValue)}</span>}
                  {addDetected.type === 'boolean' && <span className="text-purple-400">{String(addDetected.parsedValue)}</span>}
                  {addDetected.type === 'null' && <span className="text-slate-500 italic">null</span>}
                  {(addDetected.type === 'array' || addDetected.type === 'object') && (
                    <pre className="text-[10px]">{JSON.stringify(addDetected.parsedValue, null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Add Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-firebase-blue hover:bg-sky-500 text-slate-950 font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 font-sans"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Child Key to Node</span>
            </button>
          </form>
        )}

        {/* EDIT NODE TAB */}
        {activeTab === 'edit' && selectedPath.length > 0 && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs">Edit Selected Node</span>
              <span className="text-[10px] text-slate-500 font-sans">Preserves key order</span>
            </div>

            {/* Key Field (Editable unless parent is array) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Key Name {isParentArray && <span className="text-amber-400 font-normal">(Array Index - Read Only)</span>}
              </label>
              <input
                type="text"
                value={editKeyInput}
                onChange={(e) => setEditKeyInput(e.target.value)}
                readOnly={isParentArray}
                className={`w-full bg-firebase-card border border-firebase-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-firebase-blue transition ${
                  isParentArray ? 'bg-firebase-dark/60 text-slate-400 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Value Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400">Value</label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Override:</span>
                  <select
                    value={editTypeOverride}
                    onChange={(e) => setEditTypeOverride(e.target.value as any)}
                    className="bg-firebase-card border border-firebase-border text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="null">Null</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={4}
                value={editValueInput}
                onChange={(e) => setEditValueInput(e.target.value)}
                className="w-full bg-firebase-card border border-firebase-border rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-firebase-blue transition font-mono resize-y"
              />
            </div>

            {/* Type badge preview */}
            <div className="bg-firebase-dark/80 rounded-lg p-3 border border-firebase-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-sans">New Type:</span>
                <span className={`px-2 py-0.5 font-bold border rounded ${editBadgeInfo.color}`}>
                  {editBadgeInfo.label}
                </span>
              </div>

              {editDetected.isInvalidJsonSyntax && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-[11px] text-rose-300 flex flex-col gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{editDetected.warningMessage}</span>
                  </div>
                  {onOpenValidator && (
                    <button
                      type="button"
                      onClick={() => onOpenValidator(editValueInput)}
                      className="self-end px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded text-[10px] font-sans font-semibold transition"
                    >
                      🔍 Inspect & Fix Error on Site
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Submit Edit */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 font-sans"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Changes</span>
            </button>
          </form>
        )}

        {/* DELETE NODE SECTION */}
        {selectedPath.length > 0 && (
          <div className="pt-4 border-t border-firebase-border">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold rounded-lg transition flex items-center justify-center gap-2 font-sans text-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete This Node</span>
              </button>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-sans font-semibold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Confirm Delete Node?</span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono bg-firebase-dark p-1.5 rounded truncate">
                  {pathToString(selectedPath)}
                </p>
                <div className="flex items-center gap-2 font-sans">
                  <button
                    onClick={() => {
                      onDeleteNode(selectedPath);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded transition text-xs"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 rounded border border-firebase-border transition text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
