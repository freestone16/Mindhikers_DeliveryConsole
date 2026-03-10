const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const backendPort = import.meta.env.VITE_BACKEND_PORT || '3004';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

export const runtimeConfig = {
    appPort: import.meta.env.VITE_APP_PORT || '5176',
    backendPort,
    apiBaseUrl: configuredApiBaseUrl
        ? trimTrailingSlash(configuredApiBaseUrl)
        : `http://localhost:${backendPort}`,
    socketUrl: configuredSocketUrl
        ? trimTrailingSlash(configuredSocketUrl)
        : `http://127.0.0.1:${backendPort}`,
};

export const buildApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${runtimeConfig.apiBaseUrl}${normalizedPath}`;
};
