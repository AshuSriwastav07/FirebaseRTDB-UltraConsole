import { useState, useCallback, useEffect } from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { BackupSnapshot } from '../types/backup';

const DB_NAME = 'rtdb_backups_db';
const STORE_NAME = 'snapshots';
const MAX_BACKUPS = 25; // Capped rolling window

export function useBackupHistory() {
  const [db, setDb] = useState<IDBPDatabase | null>(null);

  useEffect(() => {
    async function initDB() {
      try {
        const database = await openDB(DB_NAME, 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              store.createIndex('created_at', 'created_at');
            }
          },
        });
        setDb(database);
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      }
    }
    initDB();
  }, []);

  const saveSnapshot = useCallback(async (snapshot: BackupSnapshot) => {
    if (!db) throw new Error('IndexedDB not initialized');

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.put(snapshot);

    // Prune logic: delete older snapshots keeping only MAX_BACKUPS
    const index = store.index('created_at');
    let cursor = await index.openCursor(null, 'prev'); // traverse in descending order

    let count = 0;
    while (cursor) {
      count++;
      if (count > MAX_BACKUPS) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }, [db]);

  const listSnapshots = useCallback(async (): Promise<Partial<BackupSnapshot>[]> => {
    if (!db) return [];
    
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('created_at');
    
    const records = [];
    let cursor = await index.openCursor(null, 'prev');
    while (cursor) {
      // Omit 'data' to save memory on list view
      const { data, ...rest } = cursor.value;
      records.push(rest);
      cursor = await cursor.continue();
    }
    
    return records;
  }, [db]);

  const getSnapshot = useCallback(async (id: string): Promise<BackupSnapshot | null> => {
    if (!db) return null;
    const record = await db.get(STORE_NAME, id);
    return record || null;
  }, [db]);

  return {
    saveSnapshot,
    listSnapshots,
    getSnapshot,
  };
}
