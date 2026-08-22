import React, { useEffect, useState } from 'react';
import { X, HardDrive, Cloud, Download, Copy, RefreshCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { BackupSnapshot } from '../types/backup';
import { useBackupHistory } from '../hooks/useBackupHistory';
import { useSupabaseBackup } from '../hooks/useSupabaseBackup';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  historyBackup: ReturnType<typeof useBackupHistory>;
  supabaseBackup: ReturnType<typeof useSupabaseBackup>;
  onRestore: (snapshot: BackupSnapshot) => void;
}

interface MergedBackup extends Partial<BackupSnapshot> {
  source: 'onsite' | 'supabase' | 'both';
}

export const BackupHistoryPanel: React.FC<Props> = ({
  isOpen, onClose, historyBackup, supabaseBackup, onRestore
}) => {
  const [backups, setBackups] = useState<MergedBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullSnapshotCache, setFullSnapshotCache] = useState<Record<string, BackupSnapshot>>({});
  const [loadingSnapshotId, setLoadingSnapshotId] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const onsiteList = await historyBackup.listSnapshots();
      const supabaseList = supabaseBackup.isSupabaseConnected ? await supabaseBackup.listBackups() : [];

      const map = new Map<string, MergedBackup>();
      
      onsiteList.forEach(b => {
        if (b.id) map.set(b.id, { ...b, source: 'onsite' });
      });

      supabaseList.forEach(b => {
        if (b.id) {
          if (map.has(b.id)) {
            map.set(b.id, { ...b, source: 'both' });
          } else {
            map.set(b.id, { ...b, source: 'supabase' });
          }
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da; // desc
      });

      setBackups(merged);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen, supabaseBackup.isSupabaseConnected]);

  if (!isOpen) return null;

  const handleExpand = async (backup: MergedBackup) => {
    if (expandedId === backup.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(backup.id!);

    if (!fullSnapshotCache[backup.id!]) {
      setLoadingSnapshotId(backup.id!);
      try {
        let full: BackupSnapshot | null = null;
        if (backup.source === 'onsite' || backup.source === 'both') {
          full = await historyBackup.getSnapshot(backup.id!);
        }
        if (!full && (backup.source === 'supabase' || backup.source === 'both')) {
          full = await supabaseBackup.getBackup(backup.id!);
        }
        if (full) {
          setFullSnapshotCache(prev => ({ ...prev, [backup.id!]: full! }));
        }
      } catch (e) {
        console.error(e);
      }
      setLoadingSnapshotId(null);
    }
  };

  const downloadSnapshot = (snapshot: BackupSnapshot) => {
    const blob = new Blob([JSON.stringify(snapshot.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = snapshot.created_at.replace(/[:T]/g, '-').split('.')[0];
    const safePath = snapshot.affected_path ? snapshot.affected_path.replace(/\//g, '_') : 'root';
    link.download = `rtdb-backup_${dateStr}_${safePath}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (snapshot: BackupSnapshot) => {
    navigator.clipboard.writeText(JSON.stringify(snapshot.data, null, 2));
    alert('JSON copied to clipboard!');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-firebase-panel border-l border-firebase-border shadow-2xl flex flex-col z-40 transform transition-transform duration-300">
      
      <div className="px-4 py-3 bg-firebase-card/50 border-b border-firebase-border flex items-center justify-between">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          Backup History
          {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchBackups} className="p-1 text-slate-400 hover:text-white rounded">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {backups.length === 0 && !loading && (
          <div className="text-center text-xs text-slate-400 py-10">
            No backups found.
          </div>
        )}

        {backups.map(b => {
          const isExpanded = expandedId === b.id;
          const fullData = fullSnapshotCache[b.id!];
          const isLoadingData = loadingSnapshotId === b.id;
          
          return (
            <div key={b.id} className="bg-firebase-dark border border-firebase-border rounded-lg overflow-hidden flex flex-col">
              <div 
                className="p-3 cursor-pointer hover:bg-firebase-card transition flex items-start gap-3"
                onClick={() => handleExpand(b)}
              >
                <div className="text-slate-500 mt-1">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200">
                      {new Date(b.created_at!).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-firebase-card px-1.5 py-0.5 rounded text-slate-400">
                      {b.source === 'onsite' && <HardDrive className="w-3 h-3" />}
                      {b.source === 'supabase' && <Cloud className="w-3 h-3" />}
                      {b.source === 'both' && <><HardDrive className="w-3 h-3" /><Cloud className="w-3 h-3" /></>}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Op: <span className="text-amber-400 font-mono">{b.operation}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[250px]">
                    Path: {b.affected_path || '/'}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 border-t border-firebase-border bg-firebase-panel">
                  {isLoadingData && <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Loading data...</div>}
                  {!isLoadingData && !fullData && <div className="text-xs text-rose-400">Failed to load snapshot data.</div>}
                  {!isLoadingData && fullData && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onRestore(fullData)} className="flex-1 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-bold hover:bg-rose-500/30 transition">
                          Restore Live DB
                        </button>
                        <button onClick={() => downloadSnapshot(fullData)} className="p-1.5 bg-firebase-card text-slate-300 rounded hover:text-white border border-firebase-border transition" title="Download JSON">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => copyToClipboard(fullData)} className="p-1.5 bg-firebase-card text-slate-300 rounded hover:text-white border border-firebase-border transition" title="Copy to Clipboard">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="bg-firebase-dark rounded border border-firebase-border p-2 overflow-auto max-h-48 text-[10px] text-slate-300 font-mono">
                        <pre>{JSON.stringify(fullData.data, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
