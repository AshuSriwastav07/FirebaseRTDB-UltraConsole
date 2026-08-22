import React, { useState } from 'react';
import { X, Cloud, Key, Link as LinkIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { url: string; anonKey: string }) => void;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [rawSnippet, setRawSnippet] = useState('');

  if (!isOpen) return null;

  const extractConfig = (snippet: string) => {
    try {
      // Look for standard Supabase URL format: https://[project-id].supabase.co
      const urlMatch = snippet.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
      // Look for a long jwt token string, starting with 'eyJ'
      const keyMatch = snippet.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);

      if (urlMatch) setUrl(urlMatch[0]);
      if (keyMatch) setAnonKey(keyMatch[0]);
    } catch (err) {
      console.warn("Failed to parse snippet", err);
    }
  };

  const handleSnippetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawSnippet(val);
    extractConfig(val);
  };

  const handleSave = () => {
    if (!url || !anonKey) {
      alert("Please provide both URL and Anon Key.");
      return;
    }
    onSave({ url, anonKey });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-firebase-panel border border-firebase-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-firebase-border flex items-center justify-between bg-firebase-card/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-200">Supabase Cloud Backup Config</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-firebase-card transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Snippet parser */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Auto-Parse Connection Snippet
            </label>
            <textarea
              className="w-full h-24 bg-firebase-dark border border-firebase-border rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
              placeholder="Paste your Supabase JS init snippet here... (e.g. createClient('https://...', 'eyJ...'))"
              value={rawSnippet}
              onChange={handleSnippetChange}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-firebase-border"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
              <span className="bg-firebase-panel px-2">Or enter manually</span>
            </div>
          </div>

          {/* Manual inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <LinkIcon className="w-3 h-3" /> Project URL
              </label>
              <input
                type="text"
                className="w-full bg-firebase-dark border border-firebase-border rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <Key className="w-3 h-3" /> Anon Key
              </label>
              <input
                type="password"
                className="w-full bg-firebase-dark border border-firebase-border rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                placeholder="eyJhbGci..."
              />
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 text-[11px] text-amber-300 space-y-2">
            <p><strong>Note:</strong> You must create a Postgres <strong>Database Table</strong> named <code className="bg-amber-500/20 px-1 rounded">rtdb_backups</code>, <em>NOT a Storage Bucket</em>. (See Walkthrough instructions for the exact SQL schema to run).</p>
            <p><strong>Security Note:</strong> These credentials are kept in memory only and will be lost on refresh. Ensure your Supabase table has Row Level Security (RLS) configured to only allow `INSERT` for anonymous users.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-firebase-border bg-firebase-card/40 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url || !anonKey}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect to Supabase
          </button>
        </div>
      </div>
    </div>
  );
};
