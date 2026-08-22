import React, { useState } from 'react';
import { X, Check, ShieldCheck, Trash2, Database } from 'lucide-react';
import { FirebaseConfig } from '../../types/json';
import { SupabaseConfig } from '../../types/backup';

interface SettingsModalProps {
  isOpen: boolean;
  onSaveFirebase: (config: FirebaseConfig) => void;
  onSaveSupabase: (config: SupabaseConfig) => void;
  onClose: () => void;
  onPurgeCredentials?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onSaveFirebase,
  onSaveSupabase,
  onClose,
  onPurgeCredentials,
}) => {
  const [envSnippet, setEnvSnippet] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleClear = () => {
    setEnvSnippet('');
    setErrorMsg('');
    if (onPurgeCredentials) onPurgeCredentials();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const txt = envSnippet;

    const fbDbMatch = txt.match(/VITE_FIREBASE_DATABASE_URL\s*=\s*["']?([^"'\n\r]+)["']?/);
    const fbApiMatch = txt.match(/VITE_FIREBASE_API_KEY\s*=\s*["']?([^"'\n\r]+)["']?/);
    const fbAuthMatch = txt.match(/VITE_FIREBASE_AUTH_DOMAIN\s*=\s*["']?([^"'\n\r]+)["']?/);
    const fbProjMatch = txt.match(/VITE_FIREBASE_PROJECT_ID\s*=\s*["']?([^"'\n\r]+)["']?/);

    const sbUrlMatch = txt.match(/VITE_SUPABASE_URL\s*=\s*["']?([^"'\n\r]+)["']?/);
    const sbKeyMatch = txt.match(/VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\n\r]+)["']?/);

    let configuredFb = false;
    let configuredSb = false;

    if (fbDbMatch && fbDbMatch[1]) {
      let url = fbDbMatch[1].trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      onSaveFirebase({
        databaseURL: url,
        apiKey: fbApiMatch?.[1]?.trim() || '',
        authDomain: fbAuthMatch?.[1]?.trim() || '',
        projectId: fbProjMatch?.[1]?.trim() || '',
      });
      configuredFb = true;
    }

    if (sbUrlMatch && sbUrlMatch[1] && sbKeyMatch && sbKeyMatch[1]) {
      onSaveSupabase({
        url: sbUrlMatch[1].trim(),
        anonKey: sbKeyMatch[1].trim(),
      });
      configuredSb = true;
    }

    if (!configuredFb && !configuredSb) {
      setErrorMsg('Could not find required VITE_FIREBASE_DATABASE_URL or VITE_SUPABASE_URL/ANON_KEY in the pasted text.');
      return;
    }

    setEnvSnippet('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-firebase-panel border border-firebase-border rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-firebase-border bg-firebase-card/60 flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-100">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-slate-100 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Unified Database & Backup Configuration</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  100% In-Memory Privacy
                </span>
              </h3>
              <p className="text-xs text-slate-400">Paste your .env secrets below to auto-configure Firebase and Supabase instantly.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-firebase-card transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          
          <div className="space-y-3">
            <label className="block font-semibold text-slate-300">Paste your .env configuration contents here</label>
            <textarea
              required
              rows={12}
              value={envSnippet}
              onChange={e => {
                setEnvSnippet(e.target.value);
                setErrorMsg('');
              }}
              placeholder={`# FIREBASE (4 things)
VITE_FIREBASE_DATABASE_URL="https://..."
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."

# SUPABASE (2 things)
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_ANON_KEY="..."`}
              className="w-full bg-firebase-dark border border-firebase-border rounded-lg p-4 text-[13px] text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none shadow-inner"
            />
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded p-3 text-[11px] text-rose-300">
                {errorMsg}
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-300 space-y-1.5 font-sans">
              <div className="font-semibold text-amber-200">Supabase SQL Setup (Table & 3-Backup Auto-Retention):</div>
              <p className="text-[10px] text-amber-300/90 leading-relaxed font-mono">
                Create table <code className="bg-amber-500/20 px-1 rounded">rtdb_backups</code> and function <code className="bg-amber-500/20 px-1 rounded">prune_backups_keep_latest(3)</code> in your Supabase SQL Editor.
              </p>
            </div>
          </div>

          <div className="bg-firebase-dark p-3 rounded-lg border border-firebase-border space-y-1.5 text-[11px] text-slate-300 font-mono mt-2">
            <p className="leading-relaxed text-slate-400 font-sans">
              <strong className="text-emerald-400">Privacy Guarantee:</strong> Your credentials exist strictly in active browser memory. They are never saved to disk or local storage.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-firebase-border font-sans mt-4">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg transition font-medium flex items-center gap-1 text-xs"
              title="Purge all credentials from active session memory"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge Secrets</span>
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-firebase-card hover:bg-firebase-hover text-slate-300 rounded-lg transition font-medium">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-2 shadow-lg shadow-sky-500/20">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
