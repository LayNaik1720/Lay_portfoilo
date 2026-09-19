import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Last line of defence: catches render-time crashes anywhere below it so a
 * single broken component never leaves the visitor staring at a blank page.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept deliberately simple — swap for a real reporter (Sentry et al.) later.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-24">
        <div className="max-w-md text-center">
          <AlertTriangle
            size={34}
            strokeWidth={1}
            className="mx-auto mb-6 text-[var(--error)]"
            aria-hidden="true"
          />
          <p className="eyebrow mb-3 text-[var(--text-muted)]">Something broke</p>
          <h1 className="display-md mb-4">This page could not be displayed</h1>
          <p className="mb-8 text-sm leading-relaxed text-[var(--text-muted)]">
            An unexpected error stopped the page from rendering. Reloading usually
            clears it — if it keeps happening, please let us know.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} /> Reload the page
            </button>
            <a href="/" className="btn btn-outline btn-sm">
              <Home size={14} /> Back to home
            </a>
          </div>

          {import.meta.env.DEV && (
            <pre className="mt-8 overflow-x-auto border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-left text-xs text-[var(--text-muted)]">
              {error.message}
            </pre>
          )}
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
