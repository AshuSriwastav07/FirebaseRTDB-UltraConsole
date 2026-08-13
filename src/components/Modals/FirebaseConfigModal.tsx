import React, { useState, useEffect } from 'react';
import { X, Flame, Database, Check, Sparkles, AlertCircle, HelpCircle, Copy } from 'lucide-react';
import { FirebaseConfig } from '../../types/json';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  config: FirebaseConfig | null;
  onSave: (config: FirebaseConfig) => void;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  config,
  onSave,
  onClose,
}) => {
  const [databaseURL, setDatabaseURL] = useState(config?.databaseURL || '');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [projectId, setProjectId] = useState(config?.projectId || '');
  const [authDomain, setAuthDomain] = useState(config?.authDomain || '');
  const [snippetInput, setSnippetInput] = useState('');
  const [snippetError, setSnippetError] = useState('');
  const [snippetSuccess, setSnippetSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setDatabaseURL(config.databaseURL || '');
      setApiKey(config.apiKey || '');
      setProjectId(config.projectId || '');
      setAuthDomain(config.authDomain || '');
    }
  }, [config]);

  if (!isOpen) return null;

  const handleParseSnippet = () => {
    setSnippetError('');
    setSnippetSuccess(false);

    if (!snippetInput.trim()) {
      setSnippetError('Please paste your Firebase config snippet or JSON first.');
      return;
    }

    try {
      const txt = snippetInput;
      // Extract values using regex or JSON parse
      const dbUrlMatch = txt.match(/databaseURL\s*:\s*["']([^"']+)["']/i);
      const apiKeyMatch = txt.match(/apiKey\s*:\s*["']([^"']+)["']/i);
      const projIdMatch = txt.match(/projectId\s*:\s*["']([^"']+)["']/i);
      const authDomMatch = txt.match(/authDomain\s*:\s*["']([^"']+)["']/i);

      let foundAny = false;

      if (dbUrlMatch && dbUrlMatch[1]) {
        setDatabaseURL(dbUrlMatch[1]);
        foundAny = true;
      }
      if (apiKeyMatch && apiKeyMatch[1]) {
        setApiKey(apiKeyMatch[1]);
        foundAny = true;
      }
      if (projIdMatch && projIdMatch[1]) {
        setProjectId(projIdMatch[1]);
        foundAny = true;
      }
      if (authDomMatch && authDomMatch[1]) {
        setAuthDomain(authDomMatch[1]);
        foundAny = true;
      }

      // Try JSON parsing if regex didn't catch everything
      if (!foundAny) {
        try {
          const parsed = JSON.parse(txt);
          if (parsed.databaseURL) setDatabaseURL(parsed.databaseURL);
          if (parsed.apiKey) setApiKey(parsed.apiKey);
          if (parsed.projectId) setProjectId(parsed.projectId);
          if (parsed.authDomain) setAuthDomain(parsed.authDomain);
          foundAny = true;
        } catch {
          // ignore
        }
      }

      if (foundAny) {
        setSnippetSuccess(true);
        setTimeout(() => setSnippetSuccess(false), 3000);
      } else {
        setSnippetError('Could not find firebaseConfig properties in the pasted text. Please enter Database URL manually below.');
      }
    } catch (err: any) {
      setSnippetError('Error parsing snippet: ' + err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = databaseURL.trim();

    if (!url) {
      alert('Database URL is required to connect to live Firebase RTDB.');
      return;
    }

    // Auto fix missing https:// protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    onSave({
      databaseURL: url,
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-firebase-panel border border-firebase-border rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-firebase-border bg-firebase-card/60 flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-100">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Flame className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Connect Live Firebase RTDB</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                  Direct DB Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400">Manage data live inside your real Firebase Realtime Database</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-firebase-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
          {/* Quick Paste Snippet Area */}
          <div className="bg-firebase-card/80 border border-firebase-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Auto-Fill (Paste Firebase JS Snippet or JSON)</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={snippetInput}
              onChange={(e) => setSnippetInput(e.target.value)}
              placeholder='Paste firebaseConfig object here e.g.: const firebaseConfig = { databaseURL: "https://...", apiKey: "..." };'
              className="w-full bg-firebase-dark border border-firebase-border rounded p-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400 resize-none"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleParseSnippet}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-semibold text-[11px] transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Parse & Fill Below</span>
              </button>
              {snippetSuccess && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Fields Auto-Filled!
                </span>
              )}
            </div>
            {snippetError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> {snippetError}
              </p>
            )}
          </div>

          <div className="h-px bg-firebase-border my-1" />

          {/* Database URL */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">
              Firebase Database URL <span className="text-amber-400">* (Required)</span>
            </label>
            <input
              type="text"
              required
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://your-project-id-default-rtdb.firebaseio.com"
              className="w-full bg-firebase-card border border-firebase-border rounded-lg px-3 py-2 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in your Firebase Console $\rightarrow$ Realtime Database header tab.
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-firebase-card border border-firebase-border rounded-lg px-3 py-2 text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Grid: Project ID & Auth Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Project ID</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="your-project-id"
                className="w-full bg-firebase-card border border-firebase-border rounded-lg px-3 py-2 text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Auth Domain</label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="your-project-id.firebaseapp.com"
                className="w-full bg-firebase-card border border-firebase-border rounded-lg px-3 py-2 text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Security Rules Notice & Setup Tip */}
          <div className="bg-firebase-dark p-3.5 rounded-lg border border-firebase-border space-y-1.5 text-[11px] text-slate-300 font-mono">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 font-sans text-xs">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Firebase RTDB Security Rules Tip</span>
            </div>
            <p className="leading-relaxed">
              If your database requires read/write access without authentication, make sure your Firebase RTDB Rules allow read & write in test mode:
            </p>
            <div className="bg-firebase-card p-2 rounded border border-firebase-border text-emerald-400 text-[10px]">
              {`{ "rules": { ".read": true, ".write": true } }`}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-firebase-card hover:bg-firebase-hover text-slate-300 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Connect to Live RTDB</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
