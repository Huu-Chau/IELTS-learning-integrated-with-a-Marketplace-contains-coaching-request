/**
 * MockTestListening.tsx
 *
 * Mock Test > Listening — dynamically loads test sets from PostgreSQL.
 * Each set has 4 Listening tests.
 */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import MockTestSkillList, { MockTestSet } from './MockTestSkillList';

const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

export default function MockTestListening() {
    const [testSets, setTestSets] = useState<MockTestSet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[MockTestListening] fetchSets called');
        fetch(`${API_BASE}/api/cambridge-tests/sets/listening`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                console.log('[MockTestListening] fetchSets success', { count: data.sets?.length });
                setTestSets(data.sets || []);
            })
            .catch(err => {
                console.error('[MockTestListening] fetchSets error', err);
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
            skill="Listening"
            accentColor="amber"
            sessionPrefix="/mock-test/listening/session"
            testSets={testSets}
        />
    );
}
