import React from 'react';
import { AlertTriangle, RotateCcw, Home, LogOut } from 'lucide-react';
import Button from './Button';

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
    console.error('VISARTECH People ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleSignOut = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('visartech_people_demo_session');
    } catch {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-brand-text">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-brand-border shadow-card p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-subtle">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Application Rendering Recovery
              </span>
              <h2 className="text-xl font-bold text-brand-navy">
                Something went wrong in this module
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                An unexpected interface error occurred. VISARTECH People has preserved your session data so you can recover seamlessly.
              </p>
            </div>

            {/* Error Diagnostics (Collapsible) */}
            {this.state.error && (
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs overflow-x-auto max-h-32 text-slate-700 font-mono">
                <span className="font-bold text-rose-600 block mb-1">
                  {this.state.error.toString()}
                </span>
                {this.state.errorInfo?.componentStack && (
                  <span className="text-[10px] text-slate-400 block whitespace-pre">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </span>
                )}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={RotateCcw}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Home}
                onClick={this.handleReset}
              >
                Return to Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-700 text-xs"
                leftIcon={LogOut}
                onClick={this.handleSignOut}
              >
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
