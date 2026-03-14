import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-white flex items-center justify-center p-4">
          <div className="bg-secondary border border-red-500/30 rounded-xl p-8 max-w-lg w-full shadow-2xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4 font-display">Something went wrong</h1>
            <p className="text-gray-300 mb-4 font-sans">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="bg-bg/50 p-4 rounded-lg border border-white/10 mb-6 overflow-auto max-h-40">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors font-sans tracking-wider"
            >
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
