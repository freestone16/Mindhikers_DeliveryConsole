import type { ReactNode } from 'react';

interface PhasePanelProps {
  children: ReactNode;
  className?: string;
}

export function PhasePanel({ children, className = '' }: PhasePanelProps) {
  return (
    <div
      className={`rounded-xl border border-[#e4dbcc] overflow-hidden ${className}`}
      style={{ background: 'rgba(255, 252, 247, 0.78)' }}
    >
      {children}
    </div>
  );
}

interface PhasePanelHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PhasePanelHeader({ title, actions, className = '' }: PhasePanelHeaderProps) {
  return (
    <div
      className={`px-5 py-3 border-b border-[#e4dbcc] flex items-center justify-between ${className}`}
      style={{ background: 'rgba(244, 239, 229, 0.9)' }}
    >
      <div className="flex items-center gap-2">{title}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface PhasePanelBodyProps {
  children: ReactNode;
  className?: string;
}

export function PhasePanelBody({ children, className = '' }: PhasePanelBodyProps) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

interface PhasePanelFooterProps {
  children: ReactNode;
  className?: string;
}

export function PhasePanelFooter({ children, className = '' }: PhasePanelFooterProps) {
  return (
    <div className={`px-5 py-3 border-t border-[#e4dbcc] ${className}`}>
      {children}
    </div>
  );
}

interface PhaseEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PhaseEmptyState({ icon, title, description, actions }: PhaseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 gap-4">
      <div className="text-[#c97545]">{icon}</div>
      <div>
        <h3 className="text-lg font-bold text-[#342d24] mb-1">{title}</h3>
        {description && <p className="text-sm text-[#8f8372]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 mt-2">{actions}</div>}
    </div>
  );
}

interface PhaseLoadingStateProps {
  title: string;
  subtitle?: string;
}

export function PhaseLoadingState({ title, subtitle }: PhaseLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 gap-4">
      <div className="w-12 h-12 border-4 border-[#c97545]/30 border-t-[#c97545] rounded-full animate-spin" />
      <div>
        <h3 className="text-lg font-bold text-[#342d24] mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-[#8f8372]">{subtitle}</p>}
      </div>
    </div>
  );
}
