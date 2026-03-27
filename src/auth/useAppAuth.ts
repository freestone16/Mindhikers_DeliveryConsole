import { useContext } from 'react';
import { AppAuthContext } from './AppAuthContext';

export const useAppAuth = () => {
    const context = useContext(AppAuthContext);
    if (!context) {
        throw new Error('useAppAuth must be used inside AuthProvider');
    }
    return context;
};
