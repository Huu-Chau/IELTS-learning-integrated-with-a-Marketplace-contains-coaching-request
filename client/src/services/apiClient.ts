const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper to make authenticated API calls.
 * Automatically attaches the Firebase ID token.
 */
export const apiClient = {
    async request(endpoint: string, options: RequestInit = {}, token?: string | null) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    },

    // Convenience methods
    get(endpoint: string, token?: string | null) {
        return this.request(endpoint, { method: 'GET' }, token);
    },

    post(endpoint: string, data: unknown, token?: string | null) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }, token);
    },

    put(endpoint: string, data: unknown, token?: string | null) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }, token);
    },

    patch(endpoint: string, data: unknown, token?: string | null) {
        return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }, token);
    },

    del(endpoint: string, token?: string | null) {
        return this.request(endpoint, { method: 'DELETE' }, token);
    },
};
