import api from "../api";

export interface RegisterPayload {
    email: string;
    username: string;
    password: string;
    givenName: string;
    middleName?: string;
    surname: string;
}

export interface LoginPayload {
    identifier: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
        givenName: string;
        surname: string;
    }
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post('/auth/register', payload);
    return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await api.post('/auth/login', payload);
    return res.data;
}

export interface ResetPasswordPayload {
    publicId: string;
    username: string;
    newPassword: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await api.post('/auth/reset-password', payload);
}

export async function getMe() {
    const res = await api.get('/auth/me');
    return res.data;
}