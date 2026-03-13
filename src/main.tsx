import { createRoot } from "react-dom/client";
import { Component, ErrorInfo, ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// ── Global Error Boundary ───────────────────────────────────────────────────

interface EBState { error: Error | null; info: string }

class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null, info: '' };

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Only log — do NOT call setState here, that causes a render loop.
    // State is already set by getDerivedStateFromError.
    console.error('[App-Fehler]', error.message, info.componentStack);
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { error, info: error.stack ?? error.message };
  }

  handleReset = () => {
    try { localStorage.removeItem('finanzplan-v2'); } catch (_) { /* ignore */ }
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>⚠️ App-Fehler</h2>
        <p style={{ marginBottom: '1rem', color: '#374151' }}>
          Die App ist auf einen unerwarteten Fehler gestoßen. Du kannst den Cache zurücksetzen:
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
            fontSize: '1rem', marginBottom: '1.5rem'
          }}
        >
          🔄 App zurücksetzen (Daten werden gelöscht)
        </button>
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>
            Fehlerdetails (für Entwickler)
          </summary>
          <pre style={{
            background: '#f3f4f6', padding: '1rem', borderRadius: '8px',
            overflow: 'auto', fontSize: '0.75rem', marginTop: '0.5rem',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all'
          }}>
            {error.toString()}{'\n\n'}{info}
          </pre>
        </details>
      </div>
    );
  }
}

// ── Mount ───────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
