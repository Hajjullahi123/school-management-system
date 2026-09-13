import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is a chunk loading error (common during new deployments)
    const isChunkError = error && (
      error.toString().includes('Failed to fetch dynamically imported module') ||
      error.toString().includes('Loading chunk') ||
      error.toString().includes('Unexpected token') // Sometimes happens if HTML is returned instead of JS
    );

    if (isChunkError) {
      const lastChunkError = sessionStorage.getItem('last-chunk-error-time');
      const now = Date.now();
      
      // If we haven't tried to auto-reload in the last 10 seconds, do it now
      if (!lastChunkError || (now - parseInt(lastChunkError)) > 10000) {
        sessionStorage.setItem('last-chunk-error-time', now.toString());
        console.warn('Chunk loading error detected. Forcing application reload to fetch latest version...');
        window.location.reload(true); // Hard reload
        return;
      }
    }

    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error && (
        this.state.error.toString().includes('Failed to fetch dynamically imported module') ||
        this.state.error.toString().includes('Loading chunk')
      );

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-gray-100">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              {isChunkError ? 'Update Required' : 'Something went wrong'}
            </h1>
            <p className="text-gray-500 font-medium mb-8">
              {isChunkError 
                ? 'A new version of the application was just deployed. Please reload to stay in sync.' 
                : 'The application encountered an unexpected error and could not load.'}
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 overflow-auto mb-8 max-h-40">
              <p className="font-mono text-xs text-red-500 font-bold mb-2">
                {this.state.error && this.state.error.toString()}
              </p>
              <pre className="font-mono text-[10px] text-gray-400 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem('last-chunk-error-time');
                window.location.reload(true);
              }}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:brightness-125 transition-all"
            >
              Reload & Sync Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
