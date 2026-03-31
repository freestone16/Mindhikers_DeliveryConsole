import { createContext } from 'react';
import type { AccountSessionPayload, AuthStatusPayload, WorkspaceContext } from './types';

export interface AppAuthContextValue {
    authEnabled: boolean;
    isLoading: boolean;
    status: AuthStatusPayload | null;
    session: AccountSessionPayload['session'] | null;
    workspace: WorkspaceContext | null;
    refresh: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const AppAuthContext = createContext<AppAuthContextValue | null>(null);
