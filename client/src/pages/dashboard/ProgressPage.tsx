import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import ResultFormModal from '@/components/progress/ResultFormModal';
import { Target, Book } from 'lucide-react';

export default function ProgressPage() {
    const { user, getIdToken } = useAuth();
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchAttempts();
    }, [user]);

    const fetchAttempts = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const token = await getIdToken();
            const data = await apiClient.get(`/attempts/user/${user.uid}`, token);
            setAttempts(data);
        } catch (error) {
            console.error('Failed to fetch attempts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResult = async (data: any) => {
        const token = await getIdToken();
        const payload = {
            type: 'manual',
            score: data.overall,
            answers: {
                reading: data.reading,
                listening: data.listening,
                writing: data.writing,
                speaking: data.speaking,
                date: data.date
            }
        };
        await apiClient.post('/attempts', payload, token);
        await fetchAttempts();
    };

    // Prepare chart data (group by date or just timeline of overall scores)
    const chartData = [...attempts]
        .map(a => {
            const dateStr = a.type === 'manual' && a.answers?.date ? a.answers.date : a.createdAt;
            return {
                date: new Date(dateStr).toLocaleDateString(),
                timestamp: new Date(dateStr).getTime(),
                score: a.score || 0,
                type: a.type
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Chronological

    const totalTests = attempts.length;
    const averageScore = totalTests > 0 
        ? (attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalTests).toFixed(1)
        : '0.0';

    return (
        <DashboardLayout role="student">
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
                        <p className="text-gray-500 mt-1">Track your Mock Tests and Official Exam scores over time.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                        Log Result
                    </button>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Overview Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Average Band Score</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{averageScore}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-indigo-500">
                                    <Target className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Tests Taken</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalTests}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500">
                                    <Book className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#6B7280' }} />
                                        <YAxis domain={[0, 9]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} stroke="#9CA3AF" tick={{ fill: '#6B7280' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#4F46E5"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6, stroke: '#4F46E5', strokeWidth: 2, fill: '#fff' }}
                                            name="Overall Score"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    No chart data available. Start by logging a result!
                                </div>
                            )}
                        </div>

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
                                                <tr key={attempt.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        {new Date(attempt.type === 'manual' && attempt.answers?.date ? attempt.answers.date : attempt.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 capitalize">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            attempt.type === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {attempt.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {attempt.score || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {attempt.type === 'manual' && attempt.answers ? (
                                                            <div className="flex gap-2">
                                                                <span>R: {attempt.answers.reading}</span>
                                                                <span>L: {attempt.answers.listening}</span>
                                                                <span>W: {attempt.answers.writing}</span>
                                                                <span>S: {attempt.answers.speaking}</span>
                                                            </div>
                                                        ) : (
                                                            <span>Mock Test Result</span>
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

            <ResultFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddResult}
            />
        </DashboardLayout>
    );
}
