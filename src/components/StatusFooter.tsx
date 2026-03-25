import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const SOCKET_URL = 'http://127.0.0.1:3002';

export const StatusFooter = ({ isConnected, activeChatExpertId }: { isConnected: boolean; activeChatExpertId?: string }) => {
    const [syncStatus, setSyncStatus] = useState<any>(null);
    const [version, setVersion] = useState<string>('Loading...');
    const isThumbnailActive = activeChatExpertId === 'ThumbnailMaster';

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

    return (
        <footer className="w-full border-t border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(246,238,227,0.98)_0%,rgba(238,226,208,0.98)_100%)] py-1.5 px-6 text-xs z-[50] backdrop-blur">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                    <span className="text-[var(--ink-3)] font-mono">
                        {isConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
                    </span>
                </div>

                <div className="text-[var(--ink-3)]">
                    MindHikers Console {version}
                </div>

                <div className="flex items-center gap-2 text-right">
                    {syncStatus?.status === 'done' && (
                        <>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-emerald-500/80">
                                    Skills Synced ({syncStatus.count || 0})
                                </span>
                                {isThumbnailActive && syncStatus?.sourceRoot && (
                                    <span className="text-[10px] text-[var(--ink-3)]">
                                        ThumbnailMaster ← {syncStatus.sourceRoot}/ThumbnailMaster
                                    </span>
                                )}
                            </div>
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
                            <div className="flex flex-col">
                                <span className="text-red-500/80">Sync Failed</span>
                                {syncStatus?.sourceRoot && (
                                    <span className="text-[10px] text-[var(--ink-3)]">{syncStatus.sourceRoot}</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
};
