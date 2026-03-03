import React, { useState, ReactNode } from 'react';
import { X, MessageSquare, History } from 'lucide-react';

export type RightPanelMode = 'chat' | 'review' | 'history' | null;

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: RightPanelMode;
  children?: ReactNode;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  mode,
  children
}) => {
  const tabs: { id: RightPanelMode; label: string; icon: ReactNode }[] = [
    { id: 'chat', label: '对话', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'review', label: '评审', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'history', label: '历史', icon: <History className="w-4 h-4" /> },
  ];

  const modeLabel = mode ? tabs.find(t => t.id === mode)?.label : '面板';

  return (
    <div
      className={`fixed top-[72px] right-0 bottom-[32px] bg-[#0a1220] border-l border-slate-700/50 flex flex-col z-40 transition-all duration-300 ${
        isOpen ? 'w-[360px] translate-x-0' : 'w-0 translate-x-full'
      }`}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-white text-sm">
                {modeLabel}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Tab Navigation */}
          {mode && (
            <div className="flex border-b border-slate-700/50 flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {/* TODO: switch tab */}}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    mode === tab.id
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </>
      )}
    </div>
  );
};
