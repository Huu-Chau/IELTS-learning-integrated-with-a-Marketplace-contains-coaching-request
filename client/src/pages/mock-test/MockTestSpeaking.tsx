/**
 * MockTestSpeaking.tsx
 *
 * Mock Test > Speaking — lists test sets (Cambridge 20, 19, 18…)
 * Clicking "Start" launches the AI examiner for that test.
 */
import { useEffect, useState } from 'react';
import MockTestSkillList, { MockTestSet } from './MockTestSkillList';
import { apiClient } from '../../services/apiClient';

export default function MockTestSpeaking() {
    const [testSets, setTestSets] = useState<MockTestSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchTestSets() {
            setLoading(true);
            try {
                console.log('[MockTestSpeaking] fetchTestSets called');
                const data = await apiClient.get('/cambridge-tests/sets/SPEAKING');
                
                if (isMounted) {
                    // Inject the frontend session path
                    const configuredSets: MockTestSet[] = (data.sets || []).map((set: any) => ({
                        ...set,
                        tests: set.tests.map((test: any) => ({
                            ...test,
                            sessionPath: `/mock-test/speaking/session?setId=${set.id}&test=${test.testNumber}`
                        }))
                    }));
                    
                    console.log('[MockTestSpeaking] fetchTestSets success', { 
                        setsFetched: configuredSets.length 
                    });
                    setTestSets(configuredSets);
                }
            } catch (err: any) {
                console.error('[MockTestSpeaking] fetchTestSets error', err);
                if (isMounted) setError(err.message || 'Failed to load test sets.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchTestSets();

        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-400">
                <p>Loading test materials...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64 text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <MockTestSkillList
            skill="Speaking"
            accentColor="violet"
            sessionPrefix="/mock-test/speaking/session"
            testSets={testSets}
        />
    );
}
