import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import WritingResultModal from '@/components/progress/WritingResultModal';
import AttemptDetailDrawer, { AttemptRecord } from '@/components/progress/AttemptDetailDrawer';

export default function ProgressPage() {
    const { user, getIdToken } = useAuth();
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWritingSessionId, setSelectedWritingSessionId] = useState<string | null>(null);
    const [selectedAttempt, setSelectedAttempt] = useState<AttemptRecord | null>(null);

    // Remove a deleted attempt from local state immediately
    const handleDeleteAttempt = (id: number | string) => {
        console.log('[ProgressPage] handleDeleteAttempt called', { id });
        setAttempts(prev => prev.filter(a => a.id !== id));
    };

    useEffect(() => {
        fetchAttempts();
    }, [user]);

    const fetchAttempts = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const token = await getIdToken();

            const [attemptsData, writingData] = await Promise.all([
                apiClient.get(`/attempts/user/${user.uid}`, token),
                apiClient.get(`/evaluate/writing/user/${user.uid}`, token).catch(() => [])
            ]);

            const mappedWriting = (writingData || []).map((ws: any) => ({
                id: ws.id,
                createdAt: ws.createdAt,
                type: 'writing',
                score: ws.overallBand,
                status: ws.status
            }));

            const combined = [...attemptsData, ...mappedWriting]
                .filter(a => a.score !== 0)   // hide zero-score attempts (e.g. silent speaking sessions)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setAttempts(combined);
        } catch (error) {
            console.error('Failed to fetch attempts:', error);
        } finally {
            setLoading(false);
        }
    };


    function getTypeBadge(type: string) {
        switch (type) {
            case 'reading': return 'bg-blue-100 text-blue-700';
            case 'listening': return 'bg-teal-100 text-teal-700';
            case 'speaking': return 'bg-violet-100 text-violet-700';
            case 'manual': return 'bg-purple-100 text-purple-700';
            case 'writing': return 'bg-amber-100 text-amber-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    return (
        <DashboardLayout role="student">
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
                    <p className="text-gray-500 mt-1">Track your Mock Tests and Official Exam scores over time.</p>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
                    </div>
                ) : (
                    <>

                        {/* History Table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-900">Result History</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Date</th>
                                            <th className="px-6 py-4 font-medium">Type</th>
                                            <th className="px-6 py-4 font-medium">Score</th>
                                            <th className="px-6 py-4 font-medium">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attempts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                    No attempts logged yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            attempts.map((attempt) => (
                                                <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {new Date(
                                                            attempt.type === 'manual' && attempt.answers?.date
                                                                ? attempt.answers.date
                                                                : attempt.createdAt
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 capitalize">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(attempt.type)}`}>
                                                            {attempt.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {attempt.score ?? 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {attempt.type === 'writing' ? (
                                                            <button
                                                                onClick={() => setSelectedWritingSessionId(attempt.id)}
                                                                disabled={attempt.status !== 'completed'}
                                                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${attempt.status === 'completed'
                                                                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {attempt.status === 'completed' ? 'View Result' : 'In Progress'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                id={`attempt-detail-${attempt.id}`}
                                                                onClick={() => setSelectedAttempt(attempt as AttemptRecord)}
                                                                className="px-3 py-1 text-sm font-medium rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                                            >
                                                                View Result
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Writing result modal (existing) */}
            <WritingResultModal
                isOpen={!!selectedWritingSessionId}
                sessionId={selectedWritingSessionId}
                onClose={() => setSelectedWritingSessionId(null)}
            />

            {/* Attempt detail drawer (new) */}
            <AttemptDetailDrawer
                attempt={selectedAttempt}
                onClose={() => setSelectedAttempt(null)}
                onDelete={handleDeleteAttempt}
                getToken={getIdToken}
            />
        </DashboardLayout>
    );
}