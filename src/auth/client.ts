import { createAuthClient } from 'better-auth/react';
import { buildAbsoluteApiUrl } from '../config/runtime';

export const authClient = createAuthClient({
    baseURL: buildAbsoluteApiUrl('/api/auth'),
    fetchOptions: {
        credentials: 'include',
    },
});
