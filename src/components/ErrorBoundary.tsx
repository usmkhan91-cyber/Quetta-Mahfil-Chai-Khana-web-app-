import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
          <div className="max-w-md w-full bg-stone-900 border border-white/10 p-10 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-black">!</span>
            </div>
            <h2 className="text-2xl font-display font-black text-white mb-4 italic uppercase">System Distortion Detected</h2>
            <p className="text-stone-400 text-sm mb-10 leading-relaxed">
              Sahib, it seems our neural circuits encountered a heritage conflict. Please refresh the page to recalibrate the Mahfil.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary-maroon text-white rounded-xl font-bold luxury-gradient"
            >
              RELOAD SYSTEMS
            </button>
            <pre className="mt-8 text-[10px] text-left text-white/20 overflow-auto max-h-24 p-4 bg-black rounded-lg">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
