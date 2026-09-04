import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  Wrench,
  Copy,
  FileCode,
  Upload,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Database,
  Info,
  CheckCircle2,
  AlertOctagon,
  Minimize2,
  FileText,
  Plus
} from 'lucide-react';
import {
  validateJson,
  autoRepairJson,
  formatJson,
  minifyJson,
  JsonValidationResult
} from '../../utils/jsonValidator';

interface JsonValidatorModalProps {
  isOpen: boolean;
  initialContent?: string;
  initialFileName?: string;
  currentAppData?: any;
  targetMode?: 'database' | 'nodeValue';
  onApplyToApp: (repairedData: any, fileName?: string) => void;
  onClose: () => void;
}

export const JsonValidatorModal: React.FC<JsonValidatorModalProps> = ({
  isOpen,
  initialContent = '',
  initialFileName = 'data.json',
  currentAppData,
  targetMode = 'database',
  onApplyToApp,
  onClose,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [sourceName, setSourceName] = useState(initialFileName);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [autoFixNotice, setAutoFixNotice] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial content whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialContent) {
        setJsonText(initialContent);
        setSourceName(initialFileName || (targetMode === 'nodeValue' ? 'node_value.json' : 'uploaded_data.json'));
      } else if (currentAppData) {
        setJsonText(JSON.stringify(currentAppData, null, 2));
        setSourceName(initialFileName || 'current_database.json');
      } else {
        setJsonText('{\n  "status": "ready",\n  "message": "Paste your JSON here to test"\n}');
        setSourceName('inspector.json');
      }
      setAutoFixNotice(null);
      setApplied(false);
    }
  }, [isOpen, initialContent, initialFileName, currentAppData, targetMode]);

  // Real-time validation
  const validationResult: JsonValidationResult = useMemo(() => {
    return validateJson(jsonText);
  }, [jsonText]);

  const lines = jsonText.split('\n');
  const error = validationResult.error;

  const handleJumpToErrorLine = () => {
    if (!error || !textareaRef.current) return;
    const errLine = error.location.line;
    let targetIndex = 0;
    for (let i = 0; i < errLine - 1 && i < lines.length; i++) {
      targetIndex += lines[i].length + 1;
    }
    targetIndex += Math.max(0, error.location.column - 1);

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(targetIndex, Math.min(targetIndex + 1, jsonText.length));

    const lineHeight = 20;
    textareaRef.current.scrollTop = Math.max(0, (errLine - 3) * lineHeight);
  };

  // Jump to error line automatically on initial open if invalid
  useEffect(() => {
    if (isOpen && error) {
      const timer = setTimeout(() => {
        handleJumpToErrorLine();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, Boolean(error)]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrettify = () => {
    const res = formatJson(jsonText, 2);
    if (res.success) {
      setJsonText(res.formatted);
      setAutoFixNotice(['Formatted JSON cleanly with 2-space indentation.']);
    } else {
      alert('Cannot format invalid JSON. Please fix the error first or click Auto-Fix.');
    }
  };

  const handleMinify = () => {
    const res = minifyJson(jsonText);
    if (res.success) {
      setJsonText(res.minified);
      setAutoFixNotice(['Minified JSON to a single compact line.']);
    } else {
      alert('Cannot minify invalid JSON. Please fix the error first.');
    }
  };

  const handleAutoFix = () => {
    const res = autoRepairJson(jsonText);
    setJsonText(res.repairedText);
    if (res.success) {
      setAutoFixNotice(res.fixesApplied);
    } else {
      setAutoFixNotice(
        res.fixesApplied.length > 0
          ? [...res.fixesApplied, res.error || 'Check remaining syntax issue.']
          : [res.error || 'Could not automatically repair all issues.']
      );
    }
  };

  const handleInsertExactFix = () => {
    if (!error?.exactFix) {
      handleAutoFix();
      return;
    }

    const token = error.exactFix.tokenToInsert;
    if (token === undefined) {
      handleAutoFix();
      return;
    }

    const pos = error.exactFix.insertPosition !== undefined ? error.exactFix.insertPosition : error.location.position;
    const safePos = Math.max(0, Math.min(pos, jsonText.length));
    const newText = jsonText.slice(0, safePos) + token + jsonText.slice(safePos);

    const repaired = autoRepairJson(newText);
    if (repaired.success) {
      setJsonText(repaired.repairedText);
      setAutoFixNotice([`Auto-inserted missing "${token.trim()}" and resolved syntax cleanly.`]);
    } else {
      setJsonText(newText);
      setAutoFixNotice([`Inserted "${token.trim()}" at Line ${error.location.line}.`]);
    }
  };

  const handleLoadCurrentDatabase = () => {
    if (currentAppData) {
      setJsonText(JSON.stringify(currentAppData, null, 2));
      setSourceName('current_database.json');
      setAutoFixNotice(['Loaded active database content into JSON Validator.']);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      setJsonText(content);
      setSourceName(file.name);
      setAutoFixNotice([`Loaded file "${file.name}" into Validator.`]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyToApp = () => {
    if (!validationResult.isValid) {
      alert('Cannot apply invalid JSON. Please resolve the syntax error or click Auto-Fix first.');
      return;
    }
    onApplyToApp(validationResult.parsedData, sourceName);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#10141d] border border-firebase-border rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-firebase-border bg-[#161b26] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white">JSON Error Checker & Fixer</h2>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {sourceName}
                </span>
                {targetMode === 'nodeValue' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold">
                    Node Field Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Inspect syntax errors, pinpoint exact line/column, and auto-add missing braces, commas, and quotes.
              </p>
            </div>
          </div>

          {/* Validity Badge */}
          <div className="flex items-center gap-2.5">
            {validationResult.isValid ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Valid JSON</span>
              </div>
            ) : (
              <button
                onClick={handleJumpToErrorLine}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 rounded-full text-xs font-semibold transition"
                title="Click to jump to exact error position"
              >
                <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>
                  Error on Line {error?.location.line}, Col {error?.location.column} (Click to jump)
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2 border-b border-firebase-border bg-[#131822] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto Fix Button */}
            <button
              onClick={handleAutoFix}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold transition shadow-sm ${
                !validationResult.isValid
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-500/50 animate-pulse'
                  : 'bg-firebase-card hover:bg-firebase-hover text-amber-300 border border-amber-500/30'
              }`}
              title="Auto-insert missing braces, brackets, commas, colons, quotes, and format JSON"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auto-Fix Errors</span>
            </button>

            {/* Prettify */}
            <button
              onClick={handlePrettify}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
              title="Format JSON with 2-space indentation"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Prettify</span>
            </button>

            {/* Minify */}
            <button
              onClick={handleMinify}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
              title="Minify JSON into one single line"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Minify</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Load from DB */}
            <button
              onClick={handleLoadCurrentDatabase}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
              title="Load current active database JSON to inspect"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Load Active DB</span>
            </button>

            {/* Upload File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-firebase-card hover:bg-firebase-hover text-slate-300 border border-firebase-border rounded-md transition"
              title="Upload file to check"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload File</span>
            </button>

            {/* Apply to App / Database */}
            <button
              onClick={handleApplyToApp}
              disabled={!validationResult.isValid}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
                validationResult.isValid
                  ? 'bg-firebase-blue hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
              title={targetMode === 'nodeValue' ? "Apply fixed JSON to node value" : "Apply fixed JSON to database"}
            >
              {applied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>
                {applied
                  ? 'Applied!'
                  : targetMode === 'nodeValue'
                  ? 'Apply to Node Value'
                  : 'Apply to Database'}
              </span>
            </button>
          </div>
        </div>

        {/* Notice / Auto-Fix Summary Banner */}
        {autoFixNotice && autoFixNotice.length > 0 && (
          <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-300">Auto-Fix Result:</span>
              <span>{autoFixNotice.join(' • ')}</span>
            </div>
            <button
              onClick={() => setAutoFixNotice(null)}
              className="text-emerald-400 hover:text-white shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Diagnostic Error Banner when Invalid */}
          {!validationResult.isValid && error && (
            <div className="p-4 bg-rose-950/40 border-b border-rose-900/50 flex flex-col gap-2.5 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-rose-200 text-sm">{error.title}</span>
                      <button
                        onClick={handleJumpToErrorLine}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono font-bold transition"
                        title="Click to place cursor at error line"
                      >
                        Line {error.location.line}, Column {error.location.column} (Click to jump)
                      </button>
                    </div>
                    <p className="text-xs text-rose-200/90 mt-1 font-sans">
                      {error.message}
                    </p>
                    {error.exactFix && (
                      <div className="mt-1 text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Exact fix: {error.exactFix.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {error.exactFix?.tokenToInsert && (
                    <button
                      onClick={handleInsertExactFix}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md text-xs font-bold transition shadow-sm"
                      title={error.exactFix.description}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{error.exactFix.action}</span>
                    </button>
                  )}
                  <button
                    onClick={handleAutoFix}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md text-xs font-bold transition shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Auto-Fix All Errors</span>
                  </button>
                </div>
              </div>

              {/* Exact Snippet Context with High-Contrast Indicator */}
              <div className="mt-1 bg-[#0b0e14] border border-rose-900/40 rounded-lg p-2.5 font-mono text-xs overflow-x-auto">
                <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1 font-sans">
                  <span className="font-semibold text-slate-300">Exact Error Location:</span>
                  <span className="text-amber-400 font-semibold">💡 What to add: {error.suggestion}</span>
                </div>
                {error.location.snippet.lines.map((snip, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 px-1 py-0.5 rounded ${
                      snip.isErrorLine ? 'bg-rose-950/60 text-rose-200 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <span className="w-8 text-right select-none text-slate-600 shrink-0">
                      {snip.indicator ? '' : snip.lineNum}
                    </span>
                    <pre className="whitespace-pre overflow-x-auto text-xs font-mono">
                      {snip.indicator ? (
                        <span className="text-amber-300 font-black tracking-wide">{snip.text}</span>
                      ) : (
                        snip.text
                      )}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid JSON Success Banner */}
          {validationResult.isValid && (
            <div className="px-4 py-2.5 bg-emerald-950/25 border-b border-emerald-800/30 flex items-center justify-between gap-2 shrink-0 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>JSON is completely valid and ready to use in the database!</span>
              </div>
              <span className="text-emerald-400/80 font-mono">
                {lines.length} lines • {validationResult.stats.sizeFormatted}
              </span>
            </div>
          )}

          {/* Code Editor Area with Line Numbers */}
          <div className="flex-1 relative flex bg-[#0d1117] overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className="w-12 bg-[#10141d] border-r border-slate-800/80 py-3 text-right pr-3 font-mono text-xs select-none text-slate-600 overflow-hidden shrink-0">
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const isError = !validationResult.isValid && error?.location.line === lineNum;
                return (
                  <div
                    key={i}
                    onClick={isError ? handleJumpToErrorLine : undefined}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-amber-300 font-bold bg-rose-600/30 -mr-3 pr-3 border-r-2 border-amber-400 cursor-pointer'
                        : ''
                    }`}
                    title={isError ? `Click to jump to error on line ${lineNum}` : undefined}
                  >
                    {lineNum}
                  </div>
                );
              })}
            </div>

            {/* Editable Textarea */}
            <textarea
              ref={textareaRef}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste or write your JSON here..."
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-slate-200 font-mono text-xs leading-relaxed outline-none resize-none overflow-auto whitespace-pre scrollbar-thin selection:bg-purple-600/40"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-firebase-border bg-[#131822] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-mono">Lines: <strong className="text-slate-200">{lines.length}</strong></span>
            <span className="font-mono">Characters: <strong className="text-slate-200">{validationResult.stats.charsCount}</strong></span>
            <span className="font-mono">Size: <strong className="text-slate-200">{validationResult.stats.sizeFormatted}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {!validationResult.isValid ? (
              <span className="text-amber-300 font-semibold">
                ⚠️ Syntax error detected. Click <strong>Auto-Fix Errors</strong> to automatically insert missing tokens.
              </span>
            ) : (
              <span className="text-emerald-400">
                ✅ JSON is valid. Click Prettify to reformat or Apply to save.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
