import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Inbox,
    User,
    Brain,
} from 'lucide-react';

interface StudentRequest {
    id: number;
    teacherId: string | null;
    teacherName: string;
    status: 'pending' | 'accepted' | 'completed' | 'rejected';
    fee: number;
    feedbackPath: string | null;
    createdAt: string;
    updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
    pending: { label: 'Pending', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700' },
    accepted: { label: 'Success', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700' },
    completed: { label: 'Completed', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700' },
    rejected: { label: 'Declined', icon: XCircle, bg: 'bg-red-50', text: 'text-red-700' },
};

export default function MyRequests() {
    console.log('[MyRequests] render called');

    const { getIdToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [requests, setRequests] = useState<StudentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        console.log('[MyRequests] fetchRequests called');
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            const data = await apiClient.get('/marketplace/requests/mine', token);
            console.log('[MyRequests] fetchRequests success', { count: data.length });
            setRequests(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load requests';
            console.error('[MyRequests] fetchRequests error', err);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;

    return (
        <DashboardLayout role="student">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Find a Tutor</h1>
                    <p className="text-gray-500 mt-1">Connect with expert IELTS instructors for personalized guidance.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => navigate('/marketplace')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            location.pathname === '/marketplace'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        All Tutors
                    </button>
                    <button
                        onClick={() => navigate('/my-requests')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            location.pathname === '/my-requests'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        My Requests
                    </button>
                </div>

                {/* Summary cards */}
                {!loading && requests.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-50">
                                <Inbox className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                                <p className="text-xs text-gray-400">Total Requests</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-50">
                                <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                                <p className="text-xs text-gray-400">Awaiting Response</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-50">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
                                <p className="text-xs text-gray-400">Completed</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                        <p className="text-sm text-gray-500">Loading your requests...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Failed to load requests</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">{error}</p>
                        <button
                            onClick={fetchRequests}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Inbox className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700">No requests yet</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Browse the marketplace and book a tutor to get started!
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Teacher
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Submitted
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {requests.map((req) => {
                                        const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                        const StatusIcon = config.icon;

                                        return (
                                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {req.teacherName}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                Request #{req.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
                                                    >
                                                        <StatusIcon className="h-3 w-3" />
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                                                        {req.fee.toLocaleString('vi-VN')} <Brain className="h-3.5 w-3.5 text-indigo-600" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(req.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
