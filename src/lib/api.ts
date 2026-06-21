import axios, { isAxiosError } from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            Cookies.remove('token');
            // Only redirect if not on login page to allow error display
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export function axiosErrorMessage(err: unknown): string {
    if (!isAxiosError(err)) {
        return err instanceof Error ? err.message : 'Something went wrong';
    }
    if (!err.response) {
        return 'Cannot reach the API. Run jointify_api on port 3001 (see API_PROXY_TARGET in .env.local) and restart Next dev.';
    }
    const data = err.response.data;
    if (data && typeof data === 'object' && 'error' in data) {
        const msg = (data as { error: unknown }).error;
        if (typeof msg === 'string') return msg;
    }
    return err.message;
}

export default api;