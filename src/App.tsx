import React, { useState, useEffect } from 'react';
import { useJsonEditor } from './hooks/useJsonEditor';
import { useFirebaseRtdb } from './hooks/useFirebaseRtdb';
import { TopBar } from './components/TopBar';
import { Breadcrumb } from './components/Breadcrumb';
import { TreeViewContainer } from './components/TreeView/TreeViewContainer';
import { RightPanel } from './components/RightPanel/RightPanel';
import { RawJsonModal } from './components/Modals/RawJsonModal';
import { JsonValidatorModal } from './components/Modals/JsonValidatorModal';
import { BackupConfirmModal } from './components/Modals/BackupConfirmModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { BackupHistoryPanel } from './components/BackupHistoryPanel';
import { getValueByPath } from './utils/jsonOperations';
import { FirebaseConfig, AppMode } from './types/json';
import { SupabaseConfig } from './types/backup';
import { useBackupSystem } from './hooks/useBackupSystem';
import { useBackupHistory } from './hooks/useBackupHistory';
import { useSupabaseBackup } from './hooks/useSupabaseBackup';
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
    pendingChangesCount,
    appMode,
    setAppMode,
    setSearchQuery,
    selectNode,
    toggleExpandPath,
    expandAllPaths,
    collapseAllPaths,
    expandToLevel,
    importJsonData,
    loadLiveSnapshot,
    resetPendingChanges,
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
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBackupHistoryOpen, setIsBackupHistoryOpen] = useState(false);
  const [validatorContent, setValidatorContent] = useState('');
  const [validatorFileName, setValidatorFileName] = useState('');

  // 100% Transient In-Memory Firebase Credentials State (Never saved to localStorage or disk)
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);

  // Auto-load from .env and purge legacy config on mount
  useEffect(() => {
    try {
      localStorage.removeItem('firebase_rtdb_config');
    } catch {}

    const env = (import.meta as any).env;
    
    // Auto-load Firebase
    const fbDbUrl = env.VITE_FIREBASE_DATABASE_URL;
    if (fbDbUrl) {
      setFirebaseConfig({
        apiKey: env.VITE_FIREBASE_API_KEY || '',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
        databaseURL: fbDbUrl,
        projectId: env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: env.VITE_FIREBASE_APP_ID || ''
      });
      // Auto-switch to live mode if credentials are provided in env
      setAppMode('firebase');
    }

    // Auto-load Supabase
    const sbUrl = env.VITE_SUPABASE_URL;
    const sbKey = env.VITE_SUPABASE_ANON_KEY;
    if (sbUrl && sbKey) {
      setSupabaseConfig({ url: sbUrl, anonKey: sbKey });
    }
  }, []);

  const {
    db,
    liveData,
    isConnected: isFirebaseConnected,
    error: firebaseError,
    isExternalChangeDetected,
    clearExternalChange,
    pushWholeDataToFirebase,
  } = useFirebaseRtdb(firebaseConfig, appMode === 'firebase');

  const historyBackup = useBackupHistory();
  const supabaseBackup = useSupabaseBackup(supabaseConfig);
  const backupSystem = useBackupSystem(db, supabaseBackup, historyBackup);

  // On initial connection to Firebase, load live data into local editor tree only if live DB has data
  const hasLoadedLiveInitiallyRef = React.useRef(false);
  useEffect(() => {
    if (isFirebaseConnected && liveData !== null && !hasLoadedLiveInitiallyRef.current) {
      const isLiveHasData = liveData && typeof liveData === 'object' && Object.keys(liveData).length > 0;
      if (isLiveHasData) {
        loadLiveSnapshot(liveData, 'live_rtdb.json');
      }
      hasLoadedLiveInitiallyRef.current = true;
    }
    if (!isFirebaseConnected) {
      hasLoadedLiveInitiallyRef.current = false;
    }
  }, [isFirebaseConnected, liveData, loadLiveSnapshot]);

  // Active data is always the local in-memory tree state
  const activeData = data || {};

  const handleSaveFirebaseConfig = (cfg: FirebaseConfig) => {
    setFirebaseConfig(cfg);
    hasLoadedLiveInitiallyRef.current = false;
  };

  const handlePurgeCredentials = () => {
    setFirebaseConfig(null);
    setAppMode('local');
    hasLoadedLiveInitiallyRef.current = false;
  };

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'firebase') {
      if (!firebaseConfig || !firebaseConfig.databaseURL) {
        setIsSettingsModalOpen(true);
      }
    }
  };

  // Single explicit batched Push to Database action
  const handlePushToFirebase = async () => {
    if (!isFirebaseConnected) {
      setIsSettingsModalOpen(true);
      return;
    }
    
    backupSystem.executeBackupAndWrite('root_push', null, async () => {
      const res = await pushWholeDataToFirebase(activeData);
      if (res?.success) {
        resetPendingChanges();
        clearExternalChange();
        alert('Successfully pushed changes to Live Firebase Database!');
      }
    });
  };

  // 100% Free & Fast Local In-Memory Editing (No per-node live writes or modal gating)
  const handleAddChild = (path: any, key: string, value: any) => {
    addChildNode(path, key, value);
  };

  const handleUpdateValue = (path: any, newValue: any) => {
    updateValueAtPath(path, newValue);
  };

  const handleRenameKey = (parentPath: any, oldKey: string, newKey: string) => {
    renameKey(parentPath, oldKey, newKey);
  };

  const handleDeleteNode = (path: any) => {
    deleteNodeAtPath(path);
  };

  const handleImportJson = (newJsonData: any, newFileName: string, handle?: any) => {
    importJsonData(newJsonData, newFileName, handle);
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
        pendingChangesCount={pendingChangesCount}
        appMode={appMode}
        isFirebaseConnected={isFirebaseConnected}
        firebaseError={firebaseError}
        isExternalChangeDetected={isExternalChangeDetected}
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
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenBackupHistory={() => setIsBackupHistoryOpen(true)}
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
              onClick={() => setIsSettingsModalOpen(true)}
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

      {/* Consolidated Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveFirebase={handleSaveFirebaseConfig}
        onSaveSupabase={setSupabaseConfig}
        onPurgeCredentials={handlePurgeCredentials}
      />

      {/* Backup History Panel */}
      <BackupHistoryPanel
        isOpen={isBackupHistoryOpen}
        onClose={() => setIsBackupHistoryOpen(false)}
        historyBackup={historyBackup}
        supabaseBackup={supabaseBackup}
        onRestore={(snapshot) => {
          backupSystem.executeBackupAndWrite('restore', null, async () => { await pushWholeDataToFirebase(snapshot.data); });
        }}
      />

      {/* Backup Confirmation Gate Modal */}
      <BackupConfirmModal
        isOpen={backupSystem.isModalOpen}
        pendingWrite={backupSystem.pendingWrite}
        status={backupSystem.status}
        isBackingUp={backupSystem.isBackingUp}
        errorMsg={backupSystem.errorMsg}
        backupAttempted={backupSystem.backupAttempted}
        isExternalChangeDetected={isExternalChangeDetected}
        onConfirmWithBackup={backupSystem.confirmWithBackup}
        onConfirmWithoutBackup={backupSystem.confirmWithoutBackup}
        onCancel={backupSystem.cancel}
      />
    </div>
  );
};
