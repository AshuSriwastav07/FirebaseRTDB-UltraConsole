import { useState, useCallback } from 'react';
import { Database, get, ref } from 'firebase/database';
import { BackupOperation, BackupStatus, BackupSnapshot } from '../types/backup';
import { useBackupHistory } from './useBackupHistory';
import { useSupabaseBackup } from './useSupabaseBackup';

export function useBackupSystem(
  db: Database | null, 
  supabaseBackup: ReturnType<typeof useSupabaseBackup>,
  historyBackup: ReturnType<typeof useBackupHistory>
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingWrite, setPendingWrite] = useState<{
    operation: BackupOperation;
    affectedPath: string | null;
    liveWriteFn: () => Promise<void> | void;
  } | null>(null);

  const [status, setStatus] = useState<BackupStatus>({
    local: 'pending',
    onsite: 'pending',
    supabase: 'pending',
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backupAttempted, setBackupAttempted] = useState(false);

  const executeBackupAndWrite = useCallback((
    operation: BackupOperation,
    affectedPath: string | null,
    liveWriteFn: () => Promise<void> | void
  ) => {
    setPendingWrite({ operation, affectedPath, liveWriteFn });
    setStatus({ local: 'pending', onsite: 'pending', supabase: 'pending' });
    setErrorMsg(null);
    setBackupAttempted(false);
    setIsModalOpen(true);
  }, []);

  const cancel = useCallback(() => {
    setIsModalOpen(false);
    setPendingWrite(null);
  }, []);

  const performBackup = useCallback(async () => {
    if (!pendingWrite) return false;
    if (!db) {
      setErrorMsg('No active Firebase connection found.');
      return false;
    }

    setIsBackingUp(true);
    setErrorMsg(null);
    setBackupAttempted(true);

    try {
      // 1. Fetch fresh snapshot from live RTDB
      const snapshot = await get(ref(db, '/'));
      const data = snapshot.val() || {};
      
      const payloadStr = JSON.stringify(data);
      const sizeBytes = new Blob([payloadStr]).size;
      const timestamp = new Date().toISOString();
      const safePath = pendingWrite.affectedPath ? pendingWrite.affectedPath.replace(/\//g, '_') : 'root';
      const id = crypto.randomUUID();

      const backupObj: BackupSnapshot = {
        id,
        created_at: timestamp,
        operation: pendingWrite.operation,
        affected_path: pendingWrite.affectedPath,
        size_bytes: sizeBytes,
        data: data
      };

      const promises: Promise<void>[] = [];

      // A. Local Download Backup
      const localP = new Promise<void>((resolve, reject) => {
        try {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const dateStr = timestamp.replace(/[:T]/g, '-').split('.')[0];
          link.download = `rtdb-backup_${dateStr}_${safePath}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setStatus(s => ({ ...s, local: 'success' }));
          resolve();
        } catch (err) {
          setStatus(s => ({ ...s, local: 'error' }));
          reject(err);
        }
      });
      promises.push(localP);

      // B. On-site IndexedDB Backup
      const onsiteP = historyBackup.saveSnapshot(backupObj)
        .then(() => setStatus(s => ({ ...s, onsite: 'success' })))
        .catch(err => {
          console.error(err);
          setStatus(s => ({ ...s, onsite: 'error' }));
          throw err;
        });
      promises.push(onsiteP);

      // C. Supabase Cloud Backup
      let supabaseP = Promise.resolve();
      if (supabaseBackup.isSupabaseConnected) {
        supabaseP = supabaseBackup.insertBackup(backupObj)
          .then(() => setStatus(s => ({ ...s, supabase: 'success' })))
          .catch(err => {
             console.error(err);
             setStatus(s => ({ ...s, supabase: 'error' }));
             throw err;
          });
      } else {
        setStatus(s => ({ ...s, supabase: 'skipped' }));
      }
      promises.push(supabaseP);

      const results = await Promise.allSettled(promises);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        const msgs = failed.map(f => f.reason?.message || String(f.reason));
        throw new Error(`One or more backup layers failed: ${msgs.join(' | ')}`);
      }

      setIsBackingUp(false);
      return true;
    } catch (err: any) {
      console.error('Backup failure:', err);
      setErrorMsg(err.message || 'Backup failed. Please review status.');
      setIsBackingUp(false);
      return false;
    }
  }, [pendingWrite, db, historyBackup, supabaseBackup]);

  const confirmWithBackup = useCallback(async () => {
    const success = await performBackup();
    if (success && pendingWrite) {
      await pendingWrite.liveWriteFn();
      setIsModalOpen(false);
      setPendingWrite(null);
    }
  }, [performBackup, pendingWrite]);

  const confirmWithoutBackup = useCallback(async () => {
    if (pendingWrite) {
      await pendingWrite.liveWriteFn();
      setIsModalOpen(false);
      setPendingWrite(null);
    }
  }, [pendingWrite]);

  return {
    isModalOpen,
    pendingWrite,
    status,
    isBackingUp,
    errorMsg,
    backupAttempted,
    executeBackupAndWrite,
    confirmWithBackup,
    confirmWithoutBackup,
    cancel
  };
}
