const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const backendPort = import.meta.env.VITE_BACKEND_PORT || '3004';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const defaultApiBaseUrl = import.meta.env.DEV ? `http://localhost:${backendPort}` : '';
const defaultSocketUrl = import.meta.env.DEV
    ? `http://127.0.0.1:${backendPort}`
    : (typeof window !== 'undefined' ? window.location.origin : '');

export const runtimeConfig = {
    appPort: import.meta.env.VITE_APP_PORT || '5176',
    backendPort,
    apiBaseUrl: configuredApiBaseUrl
        ? trimTrailingSlash(configuredApiBaseUrl)
        : defaultApiBaseUrl,
    socketUrl: configuredSocketUrl
        ? trimTrailingSlash(configuredSocketUrl)
        : defaultSocketUrl,
};

export const buildApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return runtimeConfig.apiBaseUrl ? `${runtimeConfig.apiBaseUrl}${normalizedPath}` : normalizedPath;
};
