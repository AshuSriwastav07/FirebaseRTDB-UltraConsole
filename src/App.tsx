import React, { useState, useEffect } from 'react';
import { useJsonEditor } from './hooks/useJsonEditor';
import { useFirebaseRtdb } from './hooks/useFirebaseRtdb';
import { TopBar } from './components/TopBar';
import { Breadcrumb } from './components/Breadcrumb';
import { TreeViewContainer } from './components/TreeView/TreeViewContainer';
import { RightPanel } from './components/RightPanel/RightPanel';
import { RawJsonModal } from './components/Modals/RawJsonModal';
import { FirebaseConfigModal } from './components/Modals/FirebaseConfigModal';
import { JsonValidatorModal } from './components/Modals/JsonValidatorModal';
import { getValueByPath } from './utils/jsonOperations';
import { FirebaseConfig, AppMode } from './types/json';
import { Flame, ShieldAlert, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const {
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
  } = useJsonEditor();

  const [isRawJsonModalOpen, setIsRawJsonModalOpen] = useState(false);
  const [isFirebaseConfigModalOpen, setIsFirebaseConfigModalOpen] = useState(false);
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false);
  const [validatorContent, setValidatorContent] = useState('');
  const [validatorFileName, setValidatorFileName] = useState('');

  // 100% Transient In-Memory Firebase Credentials State (Never saved to localStorage or disk)
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);

  // Purge any legacy localStorage config items on mount
  useEffect(() => {
    try {
      localStorage.removeItem('firebase_rtdb_config');
    } catch {
      // ignore
    }
  }, []);

  const {
    liveData,
    isConnected: isFirebaseConnected,
    error: firebaseError,
    firebaseSetByPath,
    firebaseDeleteByPath,
    pushWholeDataToFirebase,
  } = useFirebaseRtdb(firebaseConfig, appMode === 'firebase');

  // Active data choice with safe fallback to local data (never null or undefined)
  const activeData = (appMode === 'firebase' && isFirebaseConnected && liveData !== null)
    ? liveData
    : (data || {});

  const handleSaveFirebaseConfig = (cfg: FirebaseConfig) => {
    setFirebaseConfig(cfg);
  };

  const handlePurgeCredentials = () => {
    setFirebaseConfig(null);
    setAppMode('local');
  };

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'firebase') {
      if (!firebaseConfig || !firebaseConfig.databaseURL) {
        setIsFirebaseConfigModalOpen(true);
      }
    }
  };

  const handlePushToFirebase = async () => {
    if (!isFirebaseConnected) {
      setIsFirebaseConfigModalOpen(true);
      return;
    }
    const confirmPush = window.confirm(
      `Push current local JSON data (${fileName}) to your live Firebase Database? This will update the database root.`
    );
    if (!confirmPush) return;

    const res = await pushWholeDataToFirebase(data);
    if (res?.success) {
      alert('Successfully pushed local JSON data to Live Firebase Database!');
    }
  };

  // Sync edits if in live firebase mode
  const handleAddChild = (path: any, key: string, value: any) => {
    addChildNode(path, key, value);
    if (appMode === 'firebase' && isFirebaseConnected) {
      const target = getValueByPath(activeData, path);
      let newTarget: any;
      if (Array.isArray(target)) {
        newTarget = [...target, value];
      } else if (typeof target === 'object' && target !== null) {
        newTarget = { ...target, [key]: value };
      } else {
        newTarget = { [key]: value };
      }
      firebaseSetByPath(path, newTarget);
    }
  };

  const handleUpdateValue = (path: any, newValue: any) => {
    updateValueAtPath(path, newValue);
    if (appMode === 'firebase' && isFirebaseConnected) {
      firebaseSetByPath(path, newValue);
    }
  };

  const handleRenameKey = (parentPath: any, oldKey: string, newKey: string) => {
    renameKey(parentPath, oldKey, newKey);
    if (appMode === 'firebase' && isFirebaseConnected) {
      const parentVal = getValueByPath(activeData, parentPath);
      if (parentVal && typeof parentVal === 'object') {
        const updated: any = {};
        for (const k of Object.keys(parentVal)) {
          if (k === oldKey) updated[newKey] = parentVal[oldKey];
          else updated[k] = parentVal[k];
        }
        firebaseSetByPath(parentPath, updated);
      }
    }
  };

  const handleDeleteNode = (path: any) => {
    deleteNodeAtPath(path);
    if (appMode === 'firebase' && isFirebaseConnected) {
      firebaseDeleteByPath(path);
    }
  };

  const handleImportJson = (newJsonData: any, newFileName: string, handle?: any) => {
    importJsonData(newJsonData, newFileName, handle);
    if (appMode === 'firebase' && isFirebaseConnected) {
      const confirmPush = window.confirm(
        `Imported ${newFileName}. Would you like to push this new data directly into your Live Firebase Database?`
      );
      if (confirmPush) {
        pushWholeDataToFirebase(newJsonData);
      }
    }
  };

  const handleOpenValidator = (content?: string, customFileName?: string) => {
    if (content !== undefined) {
      setValidatorContent(content);
      setValidatorFileName(customFileName || 'invalid_data.json');
    } else {
      setValidatorContent(JSON.stringify(activeData, null, 2));
      setValidatorFileName(fileName || 'current_database.json');
    }
    setIsValidatorModalOpen(true);
  };

  const handleApplyValidatedJson = (repairedData: any, newFileName?: string) => {
    handleImportJson(repairedData, newFileName || fileName || 'fixed_data.json');
  };

  const selectedNodeValue = getValueByPath(activeData, selectedPath);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-firebase-dark text-slate-200 font-sans">
      {/* Top Bar */}
      <TopBar
        fileName={fileName}
        hasUnsavedChanges={hasUnsavedChanges}
        appMode={appMode}
        isFirebaseConnected={isFirebaseConnected}
        firebaseError={firebaseError}
        searchQuery={searchQuery}
        searchResults={searchResults}
        undoStackLength={undoStack.length}
        redoStackLength={redoStack.length}
        onImportJson={handleImportJson}
        onExportJson={() => exportJsonFile()}
        onSave={saveToFileSystem}
        onUndo={undo}
        onRedo={redo}
        onSearchChange={setSearchQuery}
        onExpandAll={expandAllPaths}
        onCollapseAll={collapseAllPaths}
        onExpandToLevel={expandToLevel}
        onOpenRawJsonModal={() => setIsRawJsonModalOpen(true)}
        onOpenFirebaseConfigModal={() => setIsFirebaseConfigModalOpen(true)}
        onOpenValidator={handleOpenValidator}
        onLoadSample={loadSampleDataset}
        onSelectMode={handleSelectMode}
        onPushToFirebase={handlePushToFirebase}
      />

      {/* Firebase Live RTDB Connection Prompt Banner (when in firebase mode but not yet connected) */}
      {appMode === 'firebase' && !isFirebaseConnected && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 font-sans flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 font-mono">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">
              {firebaseError ? `Firebase Error: ${firebaseError}` : 'Live Firebase RTDB mode selected. Enter your Database URL to connect.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFirebaseConfigModalOpen(true)}
              className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition text-xs shadow"
            >
              Enter Firebase Database Credentials
            </button>
          </div>
        </div>
      )}

      {/* Local Mode In-Memory Session Warning Banner */}
      {appMode === 'local' && (
        <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-1.5 text-[11px] text-sky-300 font-sans flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              <strong className="text-sky-200">Zero-Storage Session:</strong> Credentials and local JSON edits are kept 100% in active memory. No data is stored anywhere on disk or local storage.
            </span>
          </div>
          <button
            onClick={() => exportJsonFile()}
            className="text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 px-2 py-0.5 rounded font-semibold transition"
          >
            Export JSON File
          </button>
        </div>
      )}

      {/* Path Breadcrumb Bar */}
      <Breadcrumb
        selectedPath={selectedPath}
        selectedNodeValue={selectedNodeValue}
        onSelectPath={selectNode}
      />

      {/* Main 2-Zone Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Firebase Tree View */}
        <TreeViewContainer
          data={activeData}
          fileName={fileName}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          searchResults={searchResults}
          searchQuery={searchQuery}
          onSelectNode={selectNode}
          onToggleExpand={toggleExpandPath}
          onAddChildClick={selectNode}
          onEditClick={selectNode}
          onDeleteClick={handleDeleteNode}
          onImportJson={handleImportJson}
        />

        {/* Right Panel: Node Inspector & Add/Edit Form */}
        <RightPanel
          rootData={activeData}
          selectedPath={selectedPath}
          onAddChild={handleAddChild}
          onUpdateValue={handleUpdateValue}
          onRenameKey={handleRenameKey}
          onDeleteNode={handleDeleteNode}
          onOpenValidator={handleOpenValidator}
        />
      </div>

      {/* Raw JSON View Modal */}
      <RawJsonModal
        isOpen={isRawJsonModalOpen}
        data={activeData}
        fileName={fileName}
        onClose={() => setIsRawJsonModalOpen(false)}
        onOpenValidator={() => handleOpenValidator()}
      />

      {/* JSON Validator & Error Fixer Modal */}
      <JsonValidatorModal
        isOpen={isValidatorModalOpen}
        initialContent={validatorContent}
        initialFileName={validatorFileName}
        currentAppData={activeData}
        onApplyToApp={handleApplyValidatedJson}
        onClose={() => setIsValidatorModalOpen(false)}
      />

      {/* Firebase Config Credentials Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseConfigModalOpen}
        config={firebaseConfig}
        onSave={handleSaveFirebaseConfig}
        onClose={() => setIsFirebaseConfigModalOpen(false)}
        onPurgeCredentials={handlePurgeCredentials}
      />
    </div>
  );
};
