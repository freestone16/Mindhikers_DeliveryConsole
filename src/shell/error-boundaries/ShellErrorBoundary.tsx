import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '../../components/primitives/Button';

interface ShellErrorBoundaryProps {
  children: ReactNode;
}

interface ShellErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Shell-level error boundary — the last resort.
 * Catches unhandled errors from the entire application.
 * Shows a full-screen fallback with a reload button.
 */
export class ShellErrorBoundary extends Component<ShellErrorBoundaryProps, ShellErrorBoundaryState> {
  constructor(props: ShellErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ShellErrorBoundary] Unhandled error:', error, info.componentStack);
    // Sentry / structured log hook point — wire in Phase 6
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--shell-bg, #faf7f0)',
          color: 'var(--ink-1, #1a1a1a)',
          fontFamily: 'Instrument Sans, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Golden Crucible 遇到了意外错误
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3, #6b6b6b)', marginBottom: 8 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3, #6b6b6b)', marginBottom: 24 }}>
            错误已被记录。请尝试刷新页面，如果问题持续出现请联系管理员。
          </p>
          <Button variant="primary" onClick={this.handleReload}>
            刷新页面
          </Button>
        </div>
      </div>
    );
  }
}
