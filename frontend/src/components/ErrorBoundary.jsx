import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-6 my-12 border-rose-500/20 bg-rose-500/5">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-rose-500">Something went wrong rendering this component</h3>
            <p className="text-xs font-mono bg-slate-900 text-rose-350 p-4 rounded-xl text-left overflow-x-auto max-h-40">
              {this.state.error?.toString()}
            </p>
            {this.state.errorInfo && (
              <details className="text-left text-[10px] text-slate-400 cursor-pointer">
                <summary className="hover:text-slate-350 py-1">View Component Stack Trace</summary>
                <pre className="mt-2 p-3 bg-slate-950 text-slate-400 rounded-lg max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
