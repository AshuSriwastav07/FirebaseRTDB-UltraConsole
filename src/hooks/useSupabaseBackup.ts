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

  // Enforces the "insert-only" rule
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

    const { error } = await supabase.from('rtdb_backups').insert([row]);
    
    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
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
