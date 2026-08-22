import { NodePath } from './json';

export type BackupOperation = 'root_push' | 'node_edit' | 'node_add' | 'node_delete' | 'restore';
export type BackupSource = 'local' | 'onsite' | 'supabase';

export interface BackupSnapshot {
  id: string; // UUID
  created_at: string; // ISO string
  operation: BackupOperation;
  affected_path: string | null; // e.g., 'root' or 'content/6th'
  size_bytes: number;
  note?: string;
  data: any; // The full JSON snapshot payload
}

export interface BackupStatus {
  local: 'pending' | 'success' | 'error' | 'skipped';
  onsite: 'pending' | 'success' | 'error';
  supabase: 'pending' | 'success' | 'error' | 'skipped';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
