import { useState, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BackupSnapshot, SupabaseConfig } from '../types/backup';

export function useSupabaseBackup(config: SupabaseConfig | null) {
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Initialize client only when config changes
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!config || !config.url || !config.anonKey) {
      setIsSupabaseConnected(false);
      return null;
    }
    try {
      const client = createClient(config.url, config.anonKey);
      setIsSupabaseConnected(true);
      setSupabaseError(null);
      return client;
    } catch (err: any) {
      console.error('Supabase Init Error:', err);
      setSupabaseError(err.message || 'Supabase initialization failed.');
      setIsSupabaseConnected(false);
      return null;
    }
  }, [config]);

  // Enforces the "insert & auto-prune-to-3" rule
  const insertBackup = useCallback(async (snapshot: BackupSnapshot) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized or credentials missing.');
    }
    
    const row = {
      id: snapshot.id,
      created_at: snapshot.created_at,
      operation: snapshot.operation,
      affected_path: snapshot.affected_path,
      size_bytes: snapshot.size_bytes,
      note: snapshot.note,
      data: snapshot.data
    };

    let insertError: any = null;

    // First attempt
    const { error } = await supabase.from('rtdb_backups').insert([row]);
    if (error) {
      insertError = error;
      // If statement timeout or network error, attempt one immediate retry (e.g. project waking up)
      if (error.message?.includes('timeout') || error.message?.includes('statement timeout')) {
        console.warn('Supabase insert timed out. Retrying once...');
        const retryRes = await supabase.from('rtdb_backups').insert([row]);
        if (!retryRes.error) {
          insertError = null;
        } else {
          insertError = retryRes.error;
        }
      }
    }
    
    if (insertError) {
      let msg = insertError.message || 'Unknown Supabase error';
      if (msg.includes('statement timeout')) {
        msg = 'Supabase statement timeout: The database took too long to respond. If your Supabase project was paused or is waking up, please retry in a few seconds.';
      } else if (msg.includes('relation "rtdb_backups" does not exist')) {
        msg = 'Table "rtdb_backups" does not exist in Supabase. Please run the SQL setup script to create the table.';
      }
      throw new Error(`Supabase backup error: ${msg}`);
    }

    // Immediately trigger auto-prune to keep only the 3 most recent backups
    try {
      const { error: pruneError } = await supabase.rpc('prune_backups_keep_latest', { keep_count: 3 });
      if (pruneError) {
        console.warn('Supabase auto-prune RPC warning (ensure SQL function is created):', pruneError.message);
      }
    } catch (err) {
      console.warn('Failed to execute prune_backups_keep_latest RPC:', err);
    }
  }, [supabase]);

  const listBackups = useCallback(async (): Promise<Partial<BackupSnapshot>[]> => {
    if (!supabase) return [];
    
    // Select everything EXCEPT the full data payload to save bandwidth on the list view
    const { data, error } = await supabase
      .from('rtdb_backups')
      .select('id, created_at, operation, affected_path, size_bytes, note')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Supabase list error:', error);
      return [];
    }
    
    return data as Partial<BackupSnapshot>[];
  }, [supabase]);

  const getBackup = useCallback(async (id: string): Promise<BackupSnapshot | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('rtdb_backups')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Supabase get error:', error);
      return null;
    }
    return data as BackupSnapshot;
  }, [supabase]);

  return {
    supabase,
    isSupabaseConnected,
    supabaseError,
    insertBackup,
    listBackups,
    getBackup
  };
}
