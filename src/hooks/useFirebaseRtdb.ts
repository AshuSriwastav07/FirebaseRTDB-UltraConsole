import { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, Database } from 'firebase/database';
import { FirebaseConfig, NodePath } from '../types/json';

export function useFirebaseRtdb(config: FirebaseConfig | null, active: boolean) {
  const [db, setDb] = useState<Database | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize Firebase app & DB connection
  useEffect(() => {
    if (!active || !config || !config.databaseURL) {
      setDb(null);
      setIsConnected(false);
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

      const rootRef = ref(database, '/');
      const unsubscribe = onValue(
        rootRef,
        (snapshot) => {
          setLiveData(snapshot.val());
          setIsConnected(true);
          setLoading(false);
          setError(null);
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

  // Live write operations
  const firebaseSetByPath = useCallback(async (path: NodePath, value: any) => {
    if (!db) return;
    try {
      const dbPath = path.length === 0 ? '/' : '/' + path.join('/');
      const nodeRef = ref(db, dbPath);
      await set(nodeRef, value);
    } catch (err: any) {
      console.error('Firebase write error:', err);
      alert('Firebase Write Failed: ' + (err.message || 'Check security rules or internet connection'));
    }
  }, [db]);

  const firebaseDeleteByPath = useCallback(async (path: NodePath) => {
    if (!db) return;
    try {
      if (path.length === 0) {
        await set(ref(db, '/'), null);
        return;
      }
      const dbPath = '/' + path.join('/');
      const nodeRef = ref(db, dbPath);
      await remove(nodeRef);
    } catch (err: any) {
      console.error('Firebase delete error:', err);
      alert('Firebase Delete Failed: ' + (err.message || 'Check security rules'));
    }
  }, [db]);

  const pushWholeDataToFirebase = useCallback(async (data: any) => {
    if (!db) return;
    try {
      const rootRef = ref(db, '/');
      await set(rootRef, data);
      return { success: true };
    } catch (err: any) {
      console.error('Push to Firebase error:', err);
      alert('Push to Live Firebase Failed: ' + (err.message || 'Permission denied'));
      return { success: false, error: err.message };
    }
  }, [db]);

  return {
    db,
    liveData,
    isConnected,
    error,
    loading,
    firebaseSetByPath,
    firebaseDeleteByPath,
    pushWholeDataToFirebase,
  };
}
