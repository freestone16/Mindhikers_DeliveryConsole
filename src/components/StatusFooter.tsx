import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertCircle, CheckCircle, ChevronUp, Loader2 } from 'lucide-react';
import { runtimeConfig } from '../config/runtime';
import { buildApiUrl } from '../config/runtime';

const SOCKET_URL = runtimeConfig.socketUrl;

export const StatusFooter = ({
    isConnected,
    activeChatExpertId,
}: {
    isConnected: boolean;
    activeChatExpertId?: string;
}) => {
    const [syncStatus, setSyncStatus] = useState<any>(null);
    const [version, setVersion] = useState<string>('Loading...');
    const [chatLlmLabel, setChatLlmLabel] = useState<string>('LLM 未知');
    const [showSkills, setShowSkills] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('skill-sync-status', (data: any) => {
            setSyncStatus(data);
        });

        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        fetch('/api/version')
            .then((res) => res.json())
            .then((data) => {
                if (data.version) {
                    setVersion(data.version);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const expertId = activeChatExpertId || '';
        fetch(buildApiUrl(`/api/llm-config/chatbox?expertId=${encodeURIComponent(expertId)}`))
            .then((res) => res.json())
            .then((data) => {
                if (data?.label) {
                    setChatLlmLabel(data.label);
                }
            })
            .catch(() => {
                setChatLlmLabel('LLM 未知');
            });
    }, [activeChatExpertId]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSkills(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const syncedSkills = useMemo(() => syncStatus?.synced || [], [syncStatus]);

    return (
        <footer className="z-[50] w-full border-t border-[var(--line-soft)] bg-[rgba(255,250,242,0.82)] px-6 py-2 text-xs backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="font-mono text-[var(--ink-2)]">
                        {isConnected ? 'CONSOLE ONLINE' : 'DISCONNECTED'}
                    </span>
                </div>

                <div className="text-[var(--ink-3)]">
                    MindHikers Delivery Console {version}
                </div>

                <div className="relative flex items-center gap-3" ref={dropdownRef}>
                    <span className="text-[var(--ink-3)]">{chatLlmLabel}</span>
                    {syncStatus?.status === 'done' && (
                        <>
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <button
                                type="button"
                                onClick={() => setShowSkills((prev) => !prev)}
                                className="inline-flex items-center gap-1 text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                            >
                                Skills Synced ({syncStatus.count || 0})
                                <ChevronUp className={`h-3 w-3 transition-transform ${showSkills ? 'rotate-0' : 'rotate-180'}`} />
                            </button>
                            {showSkills && (
                                <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-3 shadow-[0_16px_40px_rgba(117,88,55,0.14)]">
                                    <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Loaded Skills</div>
                                    <div className="flex flex-wrap gap-2">
                                        {syncedSkills.map((skill: string) => (
                                            <span key={skill} className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2 py-1 text-[11px] text-[var(--ink-2)]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {(!syncStatus || syncStatus.status === 'syncing') && isConnected && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-muted)]" />
                            <span className="text-[var(--ink-3)]">Checking Skills...</span>
                        </>
                    )}
                    {syncStatus?.status === 'warning' && (
                        <>
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <button
                                type="button"
                                onClick={() => setShowSkills((prev) => !prev)}
                                className="inline-flex items-center gap-1 text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                            >
                                Skills Synced ({syncStatus.count || 0})
                                <ChevronUp className={`h-3 w-3 transition-transform ${showSkills ? 'rotate-0' : 'rotate-180'}`} />
                            </button>
                            {showSkills && (
                                <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-3 shadow-[0_16px_40px_rgba(117,88,55,0.14)]">
                                    <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Loaded Skills</div>
                                    <div className="flex flex-wrap gap-2">
                                        {syncedSkills.map((skill: string) => (
                                            <span key={skill} className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2 py-1 text-[11px] text-[var(--ink-2)]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {syncStatus?.status === 'error' && (
                        <>
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="text-red-500/80">Sync Failed</span>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
};
