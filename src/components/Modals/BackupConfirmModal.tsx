import React from 'react';
import { X, ShieldAlert, HardDrive, Database, Cloud, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { BackupOperation, BackupStatus } from '../../types/backup';

interface Props {
  isOpen: boolean;
  pendingWrite: { operation: BackupOperation; affectedPath: string | null } | null;
  status: BackupStatus;
  isBackingUp: boolean;
  errorMsg: string | null;
  backupAttempted: boolean;
  isExternalChangeDetected?: boolean;
  onConfirmWithBackup: () => void;
  onConfirmWithoutBackup: () => void;
  onCancel: () => void;
}

const getOperationLabel = (op: BackupOperation) => {
  switch (op) {
    case 'root_push': return 'Overwrite Entire Live Database';
    case 'node_edit': return 'Update Node Value';
    case 'node_add': return 'Add Child Node';
    case 'node_delete': return 'Delete Node';
    case 'restore': return 'Restore Database from Backup';
    default: return 'Database Operation';
  }
};

const StatusIcon = ({ status }: { status: 'pending' | 'success' | 'error' | 'skipped' }) => {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-rose-400" />;
  if (status === 'skipped') return <span className="text-[10px] text-slate-500 font-mono border border-slate-700 px-1 rounded">SKIPPED</span>;
  return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
};

export const BackupConfirmModal: React.FC<Props> = ({
  isOpen,
  pendingWrite,
  status,
  isBackingUp,
  errorMsg,
  backupAttempted,
  isExternalChangeDetected = false,
  onConfirmWithBackup,
  onConfirmWithoutBackup,
  onCancel
}) => {
  if (!isOpen || !pendingWrite) return null;

  const hasFailedLayer = backupAttempted && (status.local === 'error' || status.onsite === 'error' || status.supabase === 'error');
  const isFinished = backupAttempted && !isBackingUp;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-firebase-panel border border-firebase-border rounded-xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-firebase-border bg-rose-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                This will update your live database
              </h3>
            </div>
          </div>
          {!isBackingUp && (
            <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-firebase-card transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div className="text-xs text-slate-300">
            You are about to <strong>{getOperationLabel(pendingWrite.operation).toLowerCase()}</strong>. 
            {pendingWrite.affectedPath && (
              <div className="mt-2 text-[11px] text-amber-300 font-mono bg-firebase-card border border-firebase-border p-2 rounded">
                Path: /{pendingWrite.affectedPath}
              </div>
            )}
            {!pendingWrite.affectedPath && (
              <div className="mt-2 text-[11px] text-rose-300 font-mono bg-rose-500/10 border border-rose-500/30 p-2 rounded">
                Path: / (Root Overwrite)
              </div>
            )}
          </div>

          {/* External Change Warning */}
          {isExternalChangeDetected && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-lg p-3 text-xs text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>External Changes Detected</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Live data has changed since you loaded it. Pushing now will overwrite those external changes too.
              </p>
            </div>
          )}

          {/* Backup Progress */}
          {(isBackingUp || backupAttempted) && (
            <div className="space-y-3 bg-firebase-dark border border-firebase-border rounded-lg p-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Backup Progress</h4>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <span>Local File Download</span>
                </div>
                <StatusIcon status={status.local} />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>On-site History Log</span>
                </div>
                <StatusIcon status={status.onsite} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span>Supabase Cloud Sync</span>
                </div>
                <StatusIcon status={status.supabase} />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] p-3 rounded">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-firebase-border bg-firebase-card/40 flex flex-col gap-3">
          {(!backupAttempted || (isFinished && hasFailedLayer)) ? (
            <button
              disabled={isBackingUp}
              onClick={onConfirmWithBackup}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isBackingUp ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Backing up...</>
              ) : (
                hasFailedLayer ? 'Retry Backup & Update' : 'Backup & Update Database'
              )}
            </button>
          ) : null}

          {/* Secondary fallback / bypass */}
          {(!isBackingUp && (!backupAttempted || hasFailedLayer)) && (
            <button
              onClick={onConfirmWithoutBackup}
              className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition text-xs font-semibold"
            >
              {hasFailedLayer ? 'Continue anyway without full backup' : 'Update without backup (Not Recommended)'}
            </button>
          )}

          {!isBackingUp && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
