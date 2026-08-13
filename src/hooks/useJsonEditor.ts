import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppMode, HistoryState, NodePath, SearchMatch } from '../types/json';
import {
  getValueByPath,
  setValueByPath,
  deleteValueByPath,
  insertChildByPath,
  renameKeyByPath,
  searchJsonTree,
  isPathEqual,
  pathToString
} from '../utils/jsonOperations';
import { SAMPLE_DATASETS } from '../utils/sampleData';

const LOCAL_STORAGE_KEY = 'firebase_rtdb_local_editor_draft_v3';
const LOCAL_STORAGE_META_KEY = 'firebase_rtdb_local_editor_meta_v3';
const MAX_HISTORY = 50;

export function useJsonEditor() {
  const [data, setData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse local draft:', e);
    }
    return SAMPLE_DATASETS.textbook_db || SAMPLE_DATASETS.ecommerce;
  });

  const [fileName, setFileName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_META_KEY) || 'textbook_db.json';
  });

  const [selectedPath, setSelectedPath] = useState<NodePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    // Default expand root and 1 level deep
    const initialSet = new Set<string>(['root']);
    if (data && typeof data === 'object') {
      Object.keys(data).slice(0, 5).forEach(k => initialSet.add(`root/${k}`));
    }
    return initialSet;
  });

  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [appMode, setAppMode] = useState<AppMode>('local');

  // Auto-save working copy to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(LOCAL_STORAGE_META_KEY, fileName);
    } catch (e) {
      console.warn('LocalStorage save failed (data may be too large):', e);
    }
  }, [data, fileName]);

  // Helper to push history entry before mutation
  const pushStateToHistory = useCallback((newData: any) => {
    setUndoStack(prev => {
      const next = [...prev, { data, selectedPath, timestamp: Date.now() }];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
    setData(newData);
    setHasUnsavedChanges(true);
  }, [data, selectedPath]);

  // Tree expansion utilities
  const toggleExpandPath = useCallback((path: NodePath) => {
    const key = pathToString(path);
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandPathAncestors = useCallback((path: NodePath) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      next.add('root');
      let currentPathStr = 'root';
      for (const segment of path) {
        currentPathStr += `/${segment}`;
        next.add(currentPathStr);
      }
      return next;
    });
  }, []);

  const selectNode = useCallback((path: NodePath) => {
    setSelectedPath(path);
    expandPathAncestors(path);
  }, [expandPathAncestors]);

  const expandAllPaths = useCallback(() => {
    const nextSet = new Set<string>();
    function walk(val: any, path: NodePath) {
      nextSet.add(pathToString(path));
      if (val !== null && typeof val === 'object') {
        if (Array.isArray(val)) {
          val.forEach((item, idx) => walk(item, [...path, idx]));
        } else {
          Object.keys(val).forEach(k => walk(val[k], [...path, k]));
        }
      }
    }
    walk(data, []);
    setExpandedPaths(nextSet);
  }, [data]);

  const collapseAllPaths = useCallback(() => {
    setExpandedPaths(new Set(['root']));
  }, []);

  const expandToLevel = useCallback((level: number) => {
    const nextSet = new Set<string>();
    function walk(val: any, path: NodePath) {
      if (path.length <= level) {
        nextSet.add(pathToString(path));
      }
      if (path.length < level && val !== null && typeof val === 'object') {
        if (Array.isArray(val)) {
          val.forEach((item, idx) => walk(item, [...path, idx]));
        } else {
          Object.keys(val).forEach(k => walk(val[k], [...path, k]));
        }
      }
    }
    walk(data, []);
    setExpandedPaths(nextSet);
  }, [data]);

  // File Operations
  const importJsonData = useCallback((newJsonData: any, newFileName: string = 'data.json', handle: any = null) => {
    setData(newJsonData);
    setFileName(newFileName);
    setFileHandle(handle);
    setSelectedPath([]);
    setUndoStack([]);
    setRedoStack([]);
    setHasUnsavedChanges(false);

    // Initial expand top level
    const initialSet = new Set<string>(['root']);
    if (newJsonData && typeof newJsonData === 'object') {
      Object.keys(newJsonData).slice(0, 10).forEach(k => initialSet.add(`root/${k}`));
    }
    setExpandedPaths(initialSet);
  }, []);

  const loadSampleDataset = useCallback((sampleKey: keyof typeof SAMPLE_DATASETS) => {
    const sample = SAMPLE_DATASETS[sampleKey];
    if (sample) {
      importJsonData(sample, `${sampleKey}_db.json`, null);
    }
  }, [importJsonData]);

  // Mutations
  const updateValueAtPath = useCallback((path: NodePath, newValue: any) => {
    const updated = setValueByPath(data, path, newValue);
    pushStateToHistory(updated);
  }, [data, pushStateToHistory]);

  const deleteNodeAtPath = useCallback((path: NodePath) => {
    if (path.length === 0) {
      pushStateToHistory({});
      setSelectedPath([]);
      return;
    }
    const updated = deleteValueByPath(data, path);
    pushStateToHistory(updated);

    // Adjust selected path if deleted
    if (isPathEqual(selectedPath, path)) {
      const parent = path.slice(0, -1);
      setSelectedPath(parent);
    }
  }, [data, selectedPath, pushStateToHistory]);

  const addChildNode = useCallback((path: NodePath, key: string, value: any) => {
    const updated = insertChildByPath(data, path, key, value);
    pushStateToHistory(updated);

    // Expand path and select newly added child node
    const target = getValueByPath(data, path);
    let childPath: NodePath;
    if (Array.isArray(target)) {
      childPath = [...path, target.length];
    } else {
      childPath = [...path, key];
    }
    selectNode(childPath);
  }, [data, pushStateToHistory, selectNode]);

  const renameKey = useCallback((parentPath: NodePath, oldKey: string, newKey: string) => {
    const updated = renameKeyByPath(data, parentPath, oldKey, newKey);
    pushStateToHistory(updated);

    // If active selected path was inside this key, update selection
    if (selectedPath.length > parentPath.length && selectedPath[parentPath.length] === oldKey) {
      const newSel = [...parentPath, newKey, ...selectedPath.slice(parentPath.length + 1)];
      setSelectedPath(newSel);
    }
  }, [data, selectedPath, pushStateToHistory]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack(prev => [{ data, selectedPath, timestamp: Date.now() }, ...prev]);
    setUndoStack(prev => prev.slice(0, -1));
    setData(last.data);
    setSelectedPath(last.selectedPath);
  }, [data, selectedPath, undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const first = redoStack[0];
    setUndoStack(prev => [...prev, { data, selectedPath, timestamp: Date.now() }]);
    setRedoStack(prev => prev.slice(1));
    setData(first.data);
    setSelectedPath(first.selectedPath);
  }, [data, selectedPath, redoStack]);

  // Export / Direct Save
  const exportJsonFile = useCallback((customFilename?: string) => {
    const targetName = customFilename || fileName || 'data.json';
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasUnsavedChanges(false);
  }, [data, fileName]);

  const saveToFileSystem = useCallback(async () => {
    const jsonStr = JSON.stringify(data, null, 2);

    // If fileHandle exists from File System Access API
    if (fileHandle && typeof fileHandle.createWritable === 'function') {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        setHasUnsavedChanges(false);
        return { success: true, message: `Successfully saved to ${fileName}` };
      } catch (err: any) {
        console.warn('File System Access API save error:', err);
      }
    }

    // Try showSaveFilePicker if available
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName || 'data.json',
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        setFileHandle(handle);
        setFileName(handle.name);
        setHasUnsavedChanges(false);
        return { success: true, message: `Saved to ${handle.name}` };
      } catch (err: any) {
        if (err.name === 'AbortError') return { success: false, message: 'Save cancelled' };
      }
    }

    // Standard fallback download
    exportJsonFile();
    return { success: true, message: 'Downloaded updated JSON file' };
  }, [data, fileName, fileHandle, exportJsonFile]);

  // Search matches computation
  const searchResults: SearchMatch[] = useMemo(() => {
    return searchJsonTree(data, searchQuery);
  }, [data, searchQuery]);

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdOrCtrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToFileSystem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveToFileSystem]);

  return {
    data,
    fileName,
    selectedPath,
    expandedPaths,
    undoStack,
    redoStack,
    searchQuery,
    searchResults,
    fileHandle,
    hasUnsavedChanges,
    appMode,
    setAppMode,
    setSearchQuery,
    selectNode,
    toggleExpandPath,
    expandAllPaths,
    collapseAllPaths,
    expandToLevel,
    importJsonData,
    loadSampleDataset,
    updateValueAtPath,
    deleteNodeAtPath,
    addChildNode,
    renameKey,
    undo,
    redo,
    exportJsonFile,
    saveToFileSystem,
  };
}
