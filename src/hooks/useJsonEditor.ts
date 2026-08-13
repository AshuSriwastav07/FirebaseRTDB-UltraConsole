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

const MAX_HISTORY = 50;

export function useJsonEditor() {
  // Start with clean empty JSON object by default (in-memory only, no localStorage persistence)
  const [data, setData] = useState<any>(() => {
    // Clear legacy draft keys from localStorage if present
    try {
      localStorage.removeItem('firebase_rtdb_local_editor_draft');
      localStorage.removeItem('firebase_rtdb_local_editor_draft_v2');
      localStorage.removeItem('firebase_rtdb_local_editor_draft_v3');
      localStorage.removeItem('firebase_rtdb_local_editor_meta');
      localStorage.removeItem('firebase_rtdb_local_editor_meta_v3');
    } catch {
      // ignore
    }
    return SAMPLE_DATASETS.textbook_db || {};
  });

  const [fileName, setFileName] = useState<string>('textbook_db.json');
  const [selectedPath, setSelectedPath] = useState<NodePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initialSet = new Set<string>(['root']);
    if (data && typeof data === 'object') {
      Object.keys(data).slice(0, 10).forEach(k => initialSet.add(`root/${k}`));
    }
    return initialSet;
  });

  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [appMode, setAppMode] = useState<AppMode>('local');

  // Warn user before refreshing or closing tab if they have data/unsaved changes in Local Mode
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appMode === 'local' && (hasUnsavedChanges || (data && Object.keys(data).length > 0))) {
        e.preventDefault();
        e.returnValue = 'Warning: Any unsaved local JSON data will be lost upon refreshing or closing this page. Please export your file or connect to Live Firebase RTDB.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [appMode, hasUnsavedChanges, data]);

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
      const current: NodePath = [];
      next.add('root');
      path.forEach(seg => {
        current.push(seg);
        next.add(pathToString(current));
      });
      return next;
    });
  }, []);

  const expandAllPaths = useCallback(() => {
    const nextSet = new Set<string>(['root']);
    function walk(val: any, path: NodePath) {
      if (val !== null && typeof val === 'object') {
        nextSet.add(pathToString(path));
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
    const nextSet = new Set<string>(['root']);
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
      // Clear entire database
      pushStateToHistory({});
      setSelectedPath([]);
      return;
    }
    const updated = deleteValueByPath(data, path);
    pushStateToHistory(updated);
    if (isPathEqual(selectedPath, path) || pathToString(selectedPath).startsWith(pathToString(path))) {
      const parentPath = path.slice(0, -1);
      setSelectedPath(parentPath);
    }
  }, [data, selectedPath, pushStateToHistory]);

  const addChildNode = useCallback((parentPath: NodePath, key: string, value: any) => {
    const updated = insertChildByPath(data, parentPath, key, value);
    pushStateToHistory(updated);
    expandPathAncestors([...parentPath, key]);
    setSelectedPath([...parentPath, key]);
  }, [data, pushStateToHistory, expandPathAncestors]);

  const renameKey = useCallback((parentPath: NodePath, oldKey: string, newKey: string) => {
    const updated = renameKeyByPath(data, parentPath, oldKey, newKey);
    pushStateToHistory(updated);
    if (selectedPath.length > parentPath.length && selectedPath[parentPath.length] === oldKey) {
      const newSelected = [...parentPath, newKey, ...selectedPath.slice(parentPath.length + 1)];
      setSelectedPath(newSelected);
    }
  }, [data, selectedPath, pushStateToHistory]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, { data, selectedPath, timestamp: Date.now() }]);
    setData(last.data);
    setSelectedPath(last.selectedPath);
    setHasUnsavedChanges(true);
  }, [undoStack, data, selectedPath]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, { data, selectedPath, timestamp: Date.now() }]);
    setData(next.data);
    setSelectedPath(next.selectedPath);
    setHasUnsavedChanges(true);
  }, [redoStack, data, selectedPath]);

  // Search execution
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchJsonTree(data, searchQuery);
  }, [data, searchQuery]);

  const selectNode = useCallback((path: NodePath) => {
    setSelectedPath(path);
    if (path.length > 0) {
      expandPathAncestors(path);
    }
  }, [expandPathAncestors]);

  // Export & Save File
  const exportJsonFile = useCallback(() => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setHasUnsavedChanges(false);
  }, [data, fileName]);

  const saveToFileSystem = useCallback(async () => {
    // If native File System Access API is supported and we have a handle
    if (fileHandle && 'createWritable' in fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        setHasUnsavedChanges(false);
        alert(`Successfully saved directly to ${fileName}`);
        return;
      } catch (err: any) {
        console.warn('File handle write failed, falling back to export:', err);
      }
    }
    exportJsonFile();
  }, [fileHandle, data, fileName, exportJsonFile]);

  return {
    data,
    fileName,
    selectedPath,
    expandedPaths,
    undoStack,
    redoStack,
    searchQuery,
    searchResults,
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
