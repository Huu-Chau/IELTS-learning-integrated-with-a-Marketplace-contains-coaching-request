/**
 * MockTestReading.tsx
 *
 * Mock Test > Reading — dynamically loads test sets from PostgreSQL.
 * Each set has 4 Reading tests.
 */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import MockTestSkillList, { MockTestSet } from './MockTestSkillList';

const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

export default function MockTestReading() {
    const [testSets, setTestSets] = useState<MockTestSet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[MockTestReading] fetchSets called');
        fetch(`${API_BASE}/api/cambridge-tests/sets/reading`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                console.log('[MockTestReading] fetchSets success', { count: data.sets?.length });
                setTestSets(data.sets || []);
            })
            .catch(err => {
                console.error('[MockTestReading] fetchSets error', err);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
            </div>
        );
    }

    return (
        <MockTestSkillList
            skill="Reading"
            accentColor="emerald"
            sessionPrefix="/mock-test/reading/session"
            testSets={testSets}
        />
    );
}
