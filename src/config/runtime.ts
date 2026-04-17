const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const backendPort = import.meta.env.VITE_BACKEND_PORT || '3009';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const defaultApiBaseUrl = import.meta.env.DEV ? '' : '';
const defaultSocketUrl = import.meta.env.DEV ? browserOrigin : browserOrigin;

export const runtimeConfig = {
    appPort: import.meta.env.VITE_APP_PORT || '5182',
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

export const buildAbsoluteApiUrl = (path: string) => {
    const target = buildApiUrl(path);

    if (/^https?:\/\//.test(target)) {
        return target;
    }

    const origin = browserOrigin || `http://localhost:${backendPort}`;
    return new URL(target, origin).toString();
};
