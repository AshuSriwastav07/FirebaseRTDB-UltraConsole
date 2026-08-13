import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Flame, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen w-screen bg-firebase-dark text-slate-200 p-6 font-sans">
          <div className="bg-firebase-panel border border-firebase-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <span>Workspace Error Guard</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded">
                    Protected
                  </span>
                </h2>
                <p className="text-xs text-slate-400">An unexpected UI rendering issue was isolated safely.</p>
              </div>
            </div>

            <div className="bg-firebase-card p-3 rounded-lg border border-firebase-border font-mono text-xs text-rose-300 overflow-x-auto max-h-32">
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your database data and credentials remain 100% private and protected. Click below to safely refresh and recover your workspace.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>Recover Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
