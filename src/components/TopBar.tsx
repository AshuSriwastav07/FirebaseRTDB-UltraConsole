import React, { useRef } from 'react';
import {
  Upload,
  Download,
  Save,
  Undo2,
  Redo2,
  Search,
  Maximize2,
  Minimize2,
  Code2,
  Database,
  HardDrive,
  Flame,
  Layers,
  ChevronDown,
  X,
  FileCode
} from 'lucide-react';
import { AppMode, SearchMatch } from '../types/json';
import { SAMPLE_DATASETS } from '../utils/sampleData';

interface TopBarProps {
  fileName: string;
  hasUnsavedChanges: boolean;
  appMode: AppMode;
  isFirebaseConnected?: boolean;
  firebaseError?: string | null;
  searchQuery: string;
  searchResults: SearchMatch[];
  undoStackLength: number;
  redoStackLength: number;
  onImportJson: (data: any, filename: string, handle?: any) => void;
  onExportJson: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSearchChange: (q: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
  onOpenRawJsonModal: () => void;
  onOpenFirebaseConfigModal: () => void;
  onOpenValidator: (initialContent?: string, fileName?: string) => void;
  onLoadSample: (key: keyof typeof SAMPLE_DATASETS) => void;
  onSelectMode: (mode: AppMode) => void;
  onPushToFirebase?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  fileName,
  hasUnsavedChanges,
  appMode,
  isFirebaseConnected = false,
  firebaseError = null,
  searchQuery,
  searchResults,
  undoStackLength,
  redoStackLength,
  onImportJson,
  onExportJson,
  onSave,
  onUndo,
  onRedo,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
  onOpenRawJsonModal,
  onOpenFirebaseConfigModal,
  onOpenValidator,
  onLoadSample,
  onSelectMode,
  onPushToFirebase,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = (event.target?.result as string) || '';
      try {
        const parsed = JSON.parse(rawText);
        onImportJson(parsed, file.name);
      } catch {
        // Automatically open the JSON validator with the file preloaded to inspect and fix the error!
        onOpenValidator(rawText, file.name);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleNativeOpenFilePicker = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
          multiple: false
        });
        const file = await handle.getFile();
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          onImportJson(parsed, file.name, handle);
        } catch {
          onOpenValidator(text, file.name);
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    // Fallback to standard input click
    fileInputRef.current?.click();
  };

  return (
    <header className="bg-firebase-panel border-b border-firebase-border px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm selection:bg-firebase-blue">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Left: Brand logo & Filename info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-100 tracking-wide">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Flame className="w-5 h-5 text-slate-900 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight text-base font-semibold">Firebase Console</span>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase font-semibold">
              {appMode === 'local' ? '100% Offline Local Mode' : 'Live Firebase Mode'}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-firebase-border hidden sm:block" />

        {/* Current File indicator badge */}
        <div className="hidden md:flex items-center gap-2 bg-firebase-card px-3 py-1.5 rounded-md border border-firebase-border font-mono text-xs text-slate-300">
          <FileCode className="w-3.5 h-3.5 text-firebase-blue" />
          <span className="font-semibold text-slate-200">{fileName}</span>
          {hasUnsavedChanges ? (
            <span className="flex h-2 w-2 relative" title="Unsaved changes">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Synced</span>
          )}
        </div>

        {/* Clear 2-Tab Mode Switcher */}
        <div className="flex items-center bg-firebase-dark p-1 rounded-lg border border-firebase-border gap-1">
          <button
            onClick={() => onSelectMode('local')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              appMode === 'local'
                ? 'bg-firebase-blue text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-firebase-card'
            }`}
            title="100% Offline Local JSON File Mode"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local JSON File</span>
          </button>

          <button
            onClick={() => onSelectMode('firebase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              appMode === 'firebase'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-amber-300 hover:bg-firebase-card'
            }`}
            title="Connect & Edit Live Firebase Realtime Database"
          >
            <span className="flex h-2 w-2 relative">
              {isFirebaseConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isFirebaseConnected ? 'bg-emerald-400' : firebaseError ? 'bg-rose-400' : 'bg-amber-400'
                }`}
              ></span>
            </span>
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Live Firebase RTDB</span>
          </button>
        </div>

        {appMode === 'firebase' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenFirebaseConfigModal}
              className="px-2.5 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
              title="Configure Firebase RTDB Database URL & Credentials"
            >
              RTDB Credentials
            </button>

            {onPushToFirebase && isFirebaseConnected && (
              <button
                onClick={onPushToFirebase}
                className="px-2.5 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition shadow-md flex items-center gap-1"
                title="Push current JSON tree directly into live Firebase Database root"
              >
                <Flame className="w-3.5 h-3.5 fill-slate-950" />
                <span>Push to Live DB</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md min-w-[240px] relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search key or value across tree... (Ctrl+F)"
            className="w-full bg-firebase-card border border-firebase-border rounded-lg pl-9 pr-20 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-firebase-blue focus:ring-1 focus:ring-firebase-blue font-mono transition-all"
          />
          {searchQuery && (
            <div className="absolute right-2 flex items-center gap-1">
              <span className="text-[10px] bg-firebase-subtleBlue text-firebase-blue font-mono font-semibold px-1.5 py-0.5 rounded">
                {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
              </span>
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Sample Datasets Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md text-xs transition">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample DB</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-firebase-card border border-firebase-border rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Load Preset Databases
            </div>
            <button
              onClick={() => onLoadSample('textbook_db')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between font-semibold"
            >
              <span>Textbook & Questions DB</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">Main</span>
            </button>
            <button
              onClick={() => onLoadSample('ecommerce')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>E-Commerce Store</span>
              <span className="text-[10px] text-emerald-400">Rich</span>
            </button>
            <button
              onClick={() => onLoadSample('social_media')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>Social Media Network</span>
              <span className="text-[10px] text-purple-400">Social</span>
            </button>
            <button
              onClick={() => onLoadSample('smart_home')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>Smart Home IoT</span>
              <span className="text-[10px] text-amber-400">IoT</span>
            </button>
            <button
              onClick={() => onLoadSample('gaming')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>Gaming Leaderboard</span>
              <span className="text-[10px] text-sky-400">Live</span>
            </button>
            <button
              onClick={() => onLoadSample('fintech')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>Fintech Banking</span>
              <span className="text-[10px] text-emerald-400 font-mono">$</span>
            </button>
            <button
              onClick={() => onLoadSample('simple')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-firebase-hover hover:text-white flex items-center justify-between"
            >
              <span>Simple Config</span>
              <span className="text-[10px] text-slate-500">Basic</span>
            </button>
          </div>
        </div>

        {/* Tree controls */}
        <div className="flex items-center bg-firebase-card border border-firebase-border rounded-md p-0.5">
          <button
            onClick={onExpandAll}
            className="p-1 text-slate-400 hover:text-white hover:bg-firebase-hover rounded transition"
            title="Expand All Nodes"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCollapseAll}
            className="p-1 text-slate-400 hover:text-white hover:bg-firebase-hover rounded transition"
            title="Collapse All Nodes"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExpandToLevel(1)}
            className="px-1.5 py-0.5 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-firebase-hover rounded transition"
            title="Expand to Level 1"
          >
            L1
          </button>
        </div>

        {/* History controls */}
        <div className="flex items-center bg-firebase-card border border-firebase-border rounded-md p-0.5">
          <button
            onClick={onUndo}
            disabled={undoStackLength === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-firebase-hover rounded transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={redoStackLength === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-firebase-hover rounded transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Import JSON */}
        <button
          onClick={handleNativeOpenFilePicker}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-200 border border-firebase-border rounded-md text-xs transition"
          title="Import JSON File from Computer"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Direct Save */}
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-blue/15 hover:bg-firebase-blue/25 text-firebase-blue border border-firebase-blue/30 rounded-md text-xs font-semibold transition"
          title="Save File Directly (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        {/* Export / Download */}
        <button
          onClick={onExportJson}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-md text-xs font-semibold transition"
          title="Export / Download JSON file to computer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* JSON Validator / Error Fixer */}
        <button
          onClick={() => onOpenValidator()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 rounded-md text-xs font-semibold transition shadow-sm"
          title="Check & Find Errors in JSON (Validator, Pinpoint & Auto-Fix)"
        >
          <FileCode className="w-3.5 h-3.5 text-purple-400" />
          <span>Check JSON</span>
        </button>

        {/* Raw JSON View */}
        <button
          onClick={onOpenRawJsonModal}
          className="p-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
          title="Raw JSON View"
        >
          <Code2 className="w-3.5 h-3.5 text-purple-400" />
        </button>
      </div>
    </header>
  );
};
