import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  let errorMessage = "Something went wrong. Please try again later.";
  let errorDetail = "";

  try {
    if (error?.message) {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        errorMessage = "Database connection error. Please check your permissions.";
        errorDetail = parsed.error;
      }
    }
  } catch (e) {
    errorMessage = error?.message || errorMessage;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
        <p className="text-slate-400 mb-6">{errorMessage}</p>
        {errorDetail && (
          <div className="bg-black/40 rounded-xl p-4 mb-6 text-left overflow-auto max-h-32">
            <code className="text-xs text-red-400/80">{errorDetail}</code>
          </div>
        )}
        <Button 
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl h-12 font-medium flex items-center justify-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Reload Application
        </Button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
