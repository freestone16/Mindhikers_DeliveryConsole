import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authClient } from './client';
import { buildApiUrl } from '../config/runtime';
import type { AccountSessionPayload, AuthStatusPayload, WorkspaceContext } from './types';
import { AppAuthContext } from './AppAuthContext';
import type { AppAuthContextValue } from './AppAuthContext';

const fetchJson = async <T,>(input: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(input, {
        credentials: 'include',
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<AuthStatusPayload | null>(null);
    const [session, setSession] = useState<AccountSessionPayload['session'] | null>(null);
    const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        const authStatus = await fetchJson<AuthStatusPayload>(buildApiUrl('/api/account/status'), {
            method: 'GET',
        });

        setStatus(authStatus);

        if (!authStatus.authEnabled) {
            setSession(null);
            setWorkspace(null);
            setIsLoading(false);
            return;
        }

        const currentSession = await authClient.getSession();
        if (!currentSession.data?.user || !currentSession.data?.session) {
            setSession(null);
            setWorkspace(null);
            setIsLoading(false);
            return;
        }

        const accountSession = await fetchJson<AccountSessionPayload>(buildApiUrl('/api/account/session'), {
            method: 'GET',
        });

        setSession(accountSession.session);
        setWorkspace(accountSession.workspace);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const boot = async () => {
            try {
                await refresh();
            } catch (error) {
                if (!cancelled) {
                    console.error('[AuthProvider] bootstrap failed:', error);
                    setIsLoading(false);
                }
            }
        };

        void boot();

        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const signOut = useCallback(async () => {
        await authClient.signOut();
        setSession(null);
        setWorkspace(null);
        await refresh();
    }, [refresh]);

    const value = useMemo<AppAuthContextValue>(() => ({
        authEnabled: Boolean(status?.authEnabled),
        isLoading,
        status,
        session,
        workspace,
        refresh,
        signOut,
    }), [isLoading, refresh, session, signOut, status, workspace]);

    return (
        <AppAuthContext.Provider value={value}>
            {children}
        </AppAuthContext.Provider>
    );
};
