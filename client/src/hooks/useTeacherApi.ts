import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

/**
 * Generic hook to fetch data from an authenticated teacher API endpoint.
 * Handles loading, error state, and token injection automatically.
 *
 * Pass `null` as the endpoint to skip fetching entirely (useful when a
 * conversation ID is not yet known, for example).
 */
export function useTeacherApi<T>(endpoint: string | null) {
    const { getIdToken } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        // No-op: caller doesn't want to fetch yet (e.g. no conversation selected)
        if (!endpoint) {
            setLoading(false);
            return;
        }
        console.log(`[useTeacherApi] fetchData called`, { endpoint });
        try {
            const token = await getIdToken();
            const result = await apiClient.get(endpoint, token);
            setData(result);
            setError(null);
            console.log(`[useTeacherApi] fetchData success`, { endpoint });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[useTeacherApi] fetchData error`, { endpoint, err });
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [endpoint, getIdToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData, setData };
}

/**
 * POST/PATCH helper for teacher API calls.
 */
export function useTeacherMutation() {
    const { getIdToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const post = useCallback(async (endpoint: string, body: unknown) => {
        console.log('[useTeacherMutation] post called', { endpoint });
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            const result = await apiClient.post(endpoint, body, token);
            console.log('[useTeacherMutation] post success', { endpoint });
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[useTeacherMutation] post error', { endpoint, err });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getIdToken]);

    const patch = useCallback(async (endpoint: string, body: unknown) => {
        console.log('[useTeacherMutation] patch called', { endpoint });
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            const result = await apiClient.patch(endpoint, body, token);
            console.log('[useTeacherMutation] patch success', { endpoint });
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[useTeacherMutation] patch error', { endpoint, err });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getIdToken]);

    const del = useCallback(async (endpoint: string) => {
        console.log('[useTeacherMutation] del called', { endpoint });
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            const result = await apiClient.del(endpoint, token);
            console.log('[useTeacherMutation] del success', { endpoint });
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[useTeacherMutation] del error', { endpoint, err });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getIdToken]);

    return { post, patch, del, loading, error };
}
