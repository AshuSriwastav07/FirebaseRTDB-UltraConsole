import React, { useState } from 'react';
import { X, Copy, Check, Code, FileText } from 'lucide-react';

interface RawJsonModalProps {
  isOpen: boolean;
  data: any;
  fileName: string;
  onClose: () => void;
}

export const RawJsonModal: React.FC<RawJsonModalProps> = ({
  isOpen,
  data,
  fileName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  if (!isOpen) return null;

  const jsonString = isCompact
    ? JSON.stringify(data)
    : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-firebase-panel border border-firebase-border rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden selection:bg-firebase-blue">
        {/* Header */}
        <div className="px-5 py-3 border-b border-firebase-border bg-firebase-card/50 flex items-center justify-between font-mono text-sm">
          <div className="flex items-center gap-2 text-slate-200">
            <Code className="w-4 h-4 text-purple-400" />
            <span className="font-bold">Raw JSON View</span>
            <span className="text-xs text-slate-400 font-normal">({fileName})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCompact(!isCompact)}
              className="flex items-center gap-1 px-2.5 py-1 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded text-xs transition font-sans"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isCompact ? 'Pretty Format' : 'Compact Format'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-firebase-blue/20 hover:bg-firebase-blue/30 text-firebase-blue border border-firebase-blue/40 rounded text-xs font-semibold transition font-sans"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Raw JSON'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-firebase-card transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-firebase-dark font-mono text-xs text-emerald-400 leading-relaxed scrollbar-thin">
          <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
