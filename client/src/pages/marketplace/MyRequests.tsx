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
    RefreshCw,
    Inbox,
    User,
    Brain,
    Plus,
    X,
    FileText,
    Mic,
    MessageSquare,
    ExternalLink,
} from 'lucide-react';

interface StudentRequest {
    id: number;
    teacherId: string | null;
    teacherName: string;
    status: 'pending' | 'accepted' | 'completed' | 'rejected';
    fee: number;
    feedbackPath: string | null;
    message: string | null;
    skill: string | null;
    requestType: string | null;
    createdAt: string;
    updatedAt: string;
}

interface CreateEvalForm {
    skill: 'Writing' | 'Speaking' | '';
    fee: string;
    contentText: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
    pending:   { label: 'Pending',     icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-700'   },
    accepted:  { label: 'In Progress', icon: CheckCircle,   bg: 'bg-blue-50',    text: 'text-blue-700'    },
    completed: { label: 'Completed',   icon: CheckCircle,   bg: 'bg-emerald-50', text: 'text-emerald-700' },
    rejected:  { label: 'Declined',    icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700'     },
};

const SKILL_CONFIG = {
    Writing: { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
    Speaking: { icon: Mic,     color: 'text-sky-600',    bg: 'bg-sky-50'    },
};

const INITIAL_FORM: CreateEvalForm = { skill: '', fee: '', contentText: '' };

export default function MyRequests() {
    console.log('[MyRequests] render called');

    const { getIdToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [requests, setRequests] = useState<StudentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Feedback detail modal state
    const [selectedFeedbackReq, setSelectedFeedbackReq] = useState<StudentRequest | null>(null);

    // Modal state (create evaluation)
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<CreateEvalForm>(INITIAL_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

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

    const handleOpenModal = () => {
        console.log('[MyRequests] handleOpenModal called');
        setForm(INITIAL_FORM);
        setFormError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        console.log('[MyRequests] handleCloseModal called');
        setShowModal(false);
    };

    const handleSubmitEvaluation = async () => {
        console.log('[MyRequests] handleSubmitEvaluation called', { form });
        setFormError(null);

        // Validate
        if (!form.skill) {
            setFormError('Please select a skill (Writing or Speaking).');
            return;
        }
        const fee = Number(form.fee);
        if (!form.fee || isNaN(fee) || fee <= 0) {
            setFormError('Please enter a valid bounty amount greater than 0.');
            return;
        }
        if (!form.contentText.trim()) {
            setFormError(
                form.skill === 'Speaking'
                    ? 'Please paste a link to your speaking recording (e.g., Google Drive).'
                    : 'Please paste your essay text.'
            );
            return;
        }

        setSubmitting(true);
        try {
            const token = await getIdToken();
            const result = await apiClient.post('/marketplace/evaluations', {
                skill: form.skill,
                fee,
                contentText: form.contentText.trim(),
            }, token);
            console.log('[MyRequests] handleSubmitEvaluation success', { id: result.id });
            setShowModal(false);
            await fetchRequests(); // Refresh the list
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create request';
            console.error('[MyRequests] handleSubmitEvaluation error', err);
            setFormError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const pendingCount   = requests.filter((r) => r.status === 'pending').length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;
    const evalCount      = requests.filter((r) => r.requestType === 'evaluation').length;

    return (
        <DashboardLayout role="student">
            <div className="space-y-6">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Find a Tutor</h1>
                        <p className="text-gray-500 mt-1">Connect with expert IELTS instructors for personalized guidance.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            id="btn-request-evaluation"
                            onClick={handleOpenModal}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Request Evaluation
                        </button>
                        <button
                            onClick={fetchRequests}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── Tabs ───────────────────────────────────────────────────── */}
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

                {/* ── Summary cards ──────────────────────────────────────────── */}
                {!loading && requests.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-50">
                                <Inbox className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                                <p className="text-xs text-gray-400">Total</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-50">
                                <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                                <p className="text-xs text-gray-400">Pending</p>
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
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-violet-50">
                                <Brain className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{evalCount}</p>
                                <p className="text-xs text-gray-400">Evaluations</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Content ────────────────────────────────────────────────── */}
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
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            Browse the marketplace to book a tutor, or post an evaluation bounty.
                        </p>
                        <button
                            onClick={handleOpenModal}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Request Your First Evaluation
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Skill</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bounty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {requests.map((req) => {
                                        const config     = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                        const StatusIcon = config.icon;
                                        const isEval     = req.requestType === 'evaluation';
                                        const skillKey   = req.skill as keyof typeof SKILL_CONFIG | null;
                                        const SkillIcon  = skillKey && SKILL_CONFIG[skillKey] ? SKILL_CONFIG[skillKey].icon  : FileText;
                                        const skillStyle = skillKey && SKILL_CONFIG[skillKey] ? SKILL_CONFIG[skillKey]       : { color: 'text-gray-500', bg: 'bg-gray-50' };

                                        return (
                                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                {/* Teacher */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isEval ? 'bg-violet-100' : 'bg-indigo-100'}`}>
                                                            <User className={`h-4 w-4 ${isEval ? 'text-violet-600' : 'text-indigo-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{req.teacherName}</p>
                                                            <p className="text-xs text-gray-400">Request #{req.id}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Type / Skill */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        {isEval ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 w-fit">
                                                                <Brain className="h-3 w-3" /> Evaluation
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 w-fit">
                                                                Booking
                                                            </span>
                                                        )}
                                                        {req.skill && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${skillStyle.bg} ${skillStyle.color} w-fit`}>
                                                                <SkillIcon className="h-3 w-3" />
                                                                {req.skill}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {config.label}
                                                    </span>
                                                </td>

                                                {/* Fee */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                                                        {req.fee.toLocaleString('vi-VN')} <Brain className="h-3.5 w-3.5 text-indigo-600" />
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(req.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}
                                                </td>

                                                {/* Details */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isEval && req.status === 'completed' && req.feedbackPath ? (
                                                        <button
                                                            id={`view-feedback-${req.id}`}
                                                            onClick={() => setSelectedFeedbackReq(req)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                            View Feedback
                                                        </button>
                                                    ) : isEval && req.status === 'accepted' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Under Review
                                                        </span>
                                                    ) : isEval && req.skill === 'Speaking' && req.message ? (
                                                        <a
                                                            href={req.message}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Recording
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    )}
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

            {/* ── Feedback Detail Modal ────────────────────────────────────── */}
            {selectedFeedbackReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Evaluation Feedback</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    IELTS {selectedFeedbackReq.skill} · {selectedFeedbackReq.teacherName}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedFeedbackReq(null)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 overflow-y-auto space-y-5">

                            {/* Band score — extracted from the first line if present */}
                            {selectedFeedbackReq.feedbackPath?.startsWith('**Estimated Band Score') && (() => {
                                const lines = selectedFeedbackReq.feedbackPath.split('\n');
                                const scoreLine = lines[0].replace(/\*\*/g, '');
                                const body = lines.slice(2).join('\n').trim();
                                return (
                                    <>
                                        <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-xl border border-violet-100">
                                            <div className="p-2 bg-violet-100 rounded-lg">
                                                <Brain className="h-5 w-5 text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Estimated Band</p>
                                                <p className="text-base font-bold text-violet-800 mt-0.5">{scoreLine.replace('Estimated Band Score: ', '')}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Teacher's Feedback</p>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{body}</p>
                                        </div>
                                    </>
                                );
                            })()}

                            {/* Plain feedback (no band score header) */}
                            {!selectedFeedbackReq.feedbackPath?.startsWith('**Estimated Band Score') && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Teacher's Feedback</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedFeedbackReq.feedbackPath}
                                    </p>
                                </div>
                            )}

                            {/* Meta info */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                <span>Request #{selectedFeedbackReq.id}</span>
                                <span>Completed {new Date(selectedFeedbackReq.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
                            <button
                                onClick={() => setSelectedFeedbackReq(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Evaluation Modal ───────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Request Manual Evaluation</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Set a bounty and a teacher will review your work.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-5">

                            {/* Skill selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Skill to Evaluate <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['Writing', 'Speaking'] as const).map((s) => {
                                        const Icon       = SKILL_CONFIG[s].icon;
                                        const isSelected = form.skill === s;
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setForm((f) => ({ ...f, skill: s }))}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                    isSelected
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : SKILL_CONFIG[s].bg}`}>
                                                    <Icon className={`h-4 w-4 ${isSelected ? 'text-indigo-600' : SKILL_CONFIG[s].color}`} />
                                                </div>
                                                <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                                                    {s}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bounty fee */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Bounty (Brain Credits) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="eval-fee-input"
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 500"
                                        value={form.fee}
                                        onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                                        className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <Brain className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Deducted immediately and held in escrow until the teacher completes the evaluation.
                                </p>
                            </div>

                            {/* Content text / link */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {form.skill === 'Speaking' ? 'Speaking Recording Link' : 'Essay Text'}
                                    <span className="text-red-500"> *</span>
                                </label>
                                <textarea
                                    id="eval-content-input"
                                    rows={form.skill === 'Speaking' ? 3 : 6}
                                    placeholder={
                                        form.skill === 'Speaking'
                                            ? 'Paste a public link to your recording (e.g., Google Drive, Vocaroo)...'
                                            : 'Paste your full essay text here for the teacher to evaluate...'
                                    }
                                    value={form.contentText}
                                    onChange={(e) => setForm((f) => ({ ...f, contentText: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                                {form.skill === 'Speaking' && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Make sure the link is publicly accessible.
                                    </p>
                                )}
                            </div>

                            {/* Error */}
                            {formError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-700">{formError}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={handleCloseModal}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                id="btn-post-bounty"
                                onClick={handleSubmitEvaluation}
                                disabled={submitting}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
                            >
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                                ) : (
                                    <><Plus className="h-4 w-4" /> Post Bounty</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
