import { Component } from "react";

const DUPLICATE_REACT =
  /Cannot read properties of null \(reading 'use[A-Z]|Invalid hook call/;

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#f7f8fa",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#1f2430",
  },
  card: {
    maxWidth: "560px",
    width: "100%",
    background: "#ffffff",
    border: "1px solid #e6e8ec",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
  },
  badge: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#b42318",
    background: "#fef3f2",
    borderRadius: "999px",
    padding: "4px 12px",
    marginBottom: "16px",
  },
  title: { fontSize: "22px", fontWeight: 600, margin: "0 0 8px" },
  text: { fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px", color: "#5a6274" },
  detail: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "12px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    background: "#f4f5f7",
    border: "1px solid #e6e8ec",
    borderRadius: "8px",
    padding: "12px",
    margin: "0 0 20px",
    color: "#3b4252",
  },
  hint: {
    fontSize: "13px",
    lineHeight: 1.6,
    background: "#fffaeb",
    border: "1px solid #fedf89",
    borderRadius: "8px",
    padding: "12px",
    margin: "0 0 20px",
    color: "#7a4d05",
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    background: "#fef0c7",
    borderRadius: "4px",
    padding: "1px 5px",
  },
  buttons: { display: "flex", gap: "12px", flexWrap: "wrap" },
  primary: {
    appearance: "none",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    background: "#1668dc",
    color: "#ffffff",
  },
  secondary: {
    appearance: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    background: "#ffffff",
    color: "#1f2430",
    border: "1px solid #d5d8de",
  },
};

class RootErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled application error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const message =
      (typeof error === "string" ? error : error?.message) ||
      "An unexpected error occurred.";
    const showStaleCacheHint =
      import.meta.env.DEV && DUPLICATE_REACT.test(message);

    return (
      <div style={styles.page}>
        <div style={styles.card} role="alert">
          <div style={styles.badge}>Application Error</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.text}>
            The application could not finish loading. Reloading usually clears
            it. If it keeps happening, sign in again.
          </p>

          <pre style={styles.detail}>{message}</pre>

          {showStaleCacheHint && (
            <div style={styles.hint}>
              <strong>Dev hint:</strong> this signature means two copies of React
              are loaded, normally a stale Vite dependency cache. Stop the dev
              server, delete <code style={styles.code}>node_modules/.vite</code>,
              restart, then hard-reload the browser.
            </div>
          )}

          <div style={styles.buttons}>
            <button
              type="button"
              style={styles.primary}
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <button
              type="button"
              style={styles.secondary}
              onClick={() => window.location.assign("/login")}
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
