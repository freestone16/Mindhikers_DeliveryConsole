import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppAuth } from './useAppAuth';
import { AuthScreen } from './AuthScreen';

export const AuthBoundary = ({ children }: { children: ReactNode }) => {
    const { authEnabled, isLoading, session } = useAppAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--shell-bg)] text-[var(--ink-1)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <p className="text-sm text-[var(--ink-3)]">Checking account session...</p>
                </div>
            </div>
        );
    }

    if (authEnabled && !session) {
        return <AuthScreen />;
    }

    return <>{children}</>;
};
