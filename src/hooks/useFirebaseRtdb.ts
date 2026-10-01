import { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, Database } from 'firebase/database';
import { FirebaseConfig, NodePath } from '../types/json';

export function useFirebaseRtdb(config: FirebaseConfig | null, active: boolean) {
  const [db, setDb] = useState<Database | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isExternalChangeDetected, setIsExternalChangeDetected] = useState<boolean>(false);

  // Initialize Firebase app & DB connection
  useEffect(() => {
    if (!active || !config || !config.databaseURL) {
      setDb(null);
      setIsConnected(false);
      setLiveData(null);
      setIsExternalChangeDetected(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let app: FirebaseApp;
      const appName = 'firebase-rtdb-console-app';
      const existingApps = getApps();
      const existing = existingApps.find(a => a.name === appName || a.name === '[DEFAULT]');

      if (existing) {
        app = existing;
      } else {
        app = initializeApp(config, appName);
      }

      const database = getDatabase(app, config.databaseURL);
      setDb(database);

      let initialLoadDone = false;
      const rootRef = ref(database, '/');
      const unsubscribe = onValue(
        rootRef,
        (snapshot) => {
          const val = snapshot.val() || {};
          setLiveData(val);
          setIsConnected(true);
          setLoading(false);
          setError(null);

          if (!initialLoadDone) {
            initialLoadDone = true;
          } else {
            // Subsequent external change notification
            setIsExternalChangeDetected(true);
          }
        },
        (err) => {
          console.error('Firebase RTDB Connection Error:', err);
          let msg = err.message || 'Failed to sync with Firebase Realtime Database';
          if (msg.includes('PERMISSION_DENIED')) {
            msg = 'PERMISSION_DENIED: Firebase Security Rules prevented read access. Set rules to { ".read": true, ".write": true } in test mode.';
          }
          setError(msg);
          setIsConnected(false);
          setLoading(false);
        }
      );

      return () => {
        unsubscribe();
      };
    } catch (err: any) {
      console.error('Firebase Init Error:', err);
      setError(err.message || 'Firebase initialization failed. Check your Database URL.');
      setIsConnected(false);
      setLoading(false);
    }
  }, [config, active]);

  const clearExternalChange = useCallback(() => {
    setIsExternalChangeDetected(false);
  }, []);

  const pushWholeDataToFirebase = useCallback(async (data: any) => {
    if (!db) return { success: false, error: 'Database not initialized' };
    try {
      const rootRef = ref(db, '/');

      // If data is not a plain object (array, primitive, null), fall back to set()
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        await set(rootRef, data);
        setIsExternalChangeDetected(false);
        return { success: true };
      }

      // Use chunked update() per top-level key to avoid "Write too large" errors.
      // Firebase's set() on root sends the entire tree as one atomic write which
      // can exceed the ~16MB single-write limit. update() writes each key separately.
      const keys = Object.keys(data);
      const CHUNK_SIZE = 20; // keys per batch

      for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        const chunk: Record<string, any> = {};
        for (let j = i; j < Math.min(i + CHUNK_SIZE, keys.length); j++) {
          chunk[keys[j]] = data[keys[j]];
        }
        await update(rootRef, chunk);
      }

      setIsExternalChangeDetected(false);
      return { success: true };
    } catch (err: any) {
      console.error('Push to Firebase error:', err);
      const msg = err.message || 'Unknown error';
      const userMsg = msg.includes('too large')
        ? 'Data is too large for Firebase. Try reducing the dataset size or splitting into smaller nodes.'
        : msg.includes('PERMISSION_DENIED')
        ? 'Permission denied. Check your Firebase Security Rules.'
        : `Push failed: ${msg}`;
      alert(userMsg);
      return { success: false, error: msg };
    }
  }, [db]);

  return {
    db,
    liveData,
    isConnected,
    error,
    loading,
    isExternalChangeDetected,
    clearExternalChange,
    pushWholeDataToFirebase,
  };
}
