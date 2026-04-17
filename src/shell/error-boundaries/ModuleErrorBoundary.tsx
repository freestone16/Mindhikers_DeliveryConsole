import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '../../components/primitives/Button';

interface ModuleErrorBoundaryProps {
  /** Display name of the module (e.g. "黄金坩埚", "圆桌") */
  moduleName: string;
  children: ReactNode;
  /** Optional callback when the module recovers via retry */
  onRetry?: () => void;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Module-level error boundary.
 * Wraps individual feature slices so one crashed module
 * doesn't take down the entire Shell.
 *
 * Shows an inline fallback within the module's slot area,
 * with a retry button that resets the boundary.
 */
export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ModuleErrorBoundary] Error in "${this.props.moduleName}":`,
      error,
      info.componentStack,
    );
    // Sentry / structured log hook point — wire in Phase 6
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          padding: 24,
          background: 'var(--shell-bg, #faf7f0)',
          color: 'var(--ink-1, #1a1a1a)',
          fontFamily: 'Instrument Sans, system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {this.props.moduleName} 模块出错
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-3, #6b6b6b)', marginBottom: 6 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3, #6b6b6b)', marginBottom: 20 }}>
            其他模块不受影响。请尝试重试。
          </p>
          <Button variant="ochre" size="sm" onClick={this.handleRetry}>
            重试
          </Button>
        </div>
      </div>
    );
  }
}
