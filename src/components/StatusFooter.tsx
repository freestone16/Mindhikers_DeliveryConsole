import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const SOCKET_URL = 'http://127.0.0.1:3002';

export const StatusFooter = ({ isConnected }: { isConnected: boolean }) => {
    const [syncStatus, setSyncStatus] = useState<any>(null);

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

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-t border-slate-800 py-1.5 px-6 text-xs z-[50]">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                    <span className="text-slate-400 font-mono">
                        {isConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
                    </span>
                </div>

                {/* Version */}
                <div className="text-slate-600">
                    MindHikers Console v3.7
                </div>

                {/* Skill Sync Status */}
                <div className="flex items-center gap-2">
                    {syncStatus?.status === 'done' && (
                        <>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500/80">
                                Skills Synced ({syncStatus.count || 0})
                            </span>
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
