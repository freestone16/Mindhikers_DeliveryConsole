import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Loader2, CheckCircle, AlertCircle, ChevronUp } from 'lucide-react';
import { SOCKET_URL } from '../config';

export const StatusFooter = ({ isConnected }: { isConnected: boolean }) => {
    const [syncStatus, setSyncStatus] = useState<any>(null);
    const [version, setVersion] = useState<string>('Loading...');
    const [showSkills, setShowSkills] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('skill-sync-status', (data: any) => {
            console.log('Sync status:', data);
            setSyncStatus(data);
        });

        return () => {
            socket.close();
        };
    }, []);

    // Fetch version from backend
    useEffect(() => {
        fetch('/api/version')
            .then(res => res.json())
            .then(data => {
                if (data.version) {
                    setVersion(data.version);
                }
            })
            .catch(console.error);
    }, []);

    // Close dropdown on outside click
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
        <footer className="w-full bg-slate-900/90 backdrop-blur border-t border-slate-800 py-1.5 px-6 text-xs z-[50]">
            <div className="flex items-center justify-between">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                    <span className="text-slate-400 font-mono">
                        {isConnected ? 'DIRECTOR ONLINE' : 'DISCONNECTED'}
                    </span>
                </div>

                {/* Version */}
                <div className="text-slate-600">
                    Director Console {version}
                </div>

                {/* Skill Sync Status with Dropdown */}
                <div className="relative flex items-center gap-2" ref={dropdownRef}>
                    {syncStatus?.status === 'done' && (
                        <>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <button
                                type="button"
                                onClick={() => setShowSkills(prev => !prev)}
                                className="inline-flex items-center gap-1 text-emerald-500/80 hover:text-emerald-400 transition-colors"
                            >
                                Skills Synced ({syncStatus.count || 0})
                                <ChevronUp className={`w-3 h-3 transition-transform ${showSkills ? 'rotate-0' : 'rotate-180'}`} />
                            </button>
                            {showSkills && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-md p-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                                    <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        Loaded Skills
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {syncedSkills.map((skill: string) => (
                                            <span
                                                key={skill}
                                                className="rounded-full border border-slate-700/50 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300"
                                            >
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
                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                            <span className="text-blue-500/80">Checking Skills...</span>
                        </>
                    )}
                    {syncStatus?.status === 'error' && (
                        <>
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <span className="text-red-500/80">Sync Failed</span>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
};
