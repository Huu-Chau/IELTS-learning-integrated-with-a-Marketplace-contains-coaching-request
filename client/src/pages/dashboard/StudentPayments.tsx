import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import TopUpModal from '@/components/payment/TopUpModal';
import {
    Banknote,
    TrendingUp,
    Clock,
    CheckCircle,
    ArrowDownCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    ReceiptText,
    Brain,
    Wallet,
    Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Payment {
    id: number;
    teacherName: string;
    service: string;
    amount: number;
    status: 'Pending' | 'Processing' | 'Paid' | 'Refunded';
    rawStatus: string;
    createdAt: string;
    updatedAt: string;
}

interface PaymentsResponse {
    walletBalance: number;
    payments: Payment[];
    totalSpent: number;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    Pending:    { color: 'text-amber-700',   bg: 'bg-amber-100',  icon: Clock,          label: 'Pending' },
    Processing: { color: 'text-blue-700',    bg: 'bg-blue-100',   icon: ArrowDownCircle, label: 'Processing' },
    Paid:       { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle,   label: 'Paid' },
    Refunded:   { color: 'text-red-600',     bg: 'bg-red-100',    icon: XCircle,        label: 'Refunded' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

const PAGE_SIZE = 8;

type FilterStatus = 'All' | 'Pending' | 'Processing' | 'Paid';

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StudentPayments() {
    console.log('[StudentPayments] render called');

    const { getIdToken } = useAuth();
    const [data, setData] = useState<PaymentsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [showTopUp, setShowTopUp] = useState(false);

    useEffect(() => {
        async function fetchPayments() {
            console.log('[StudentPayments] fetchPayments called');
            try {
                const token = await getIdToken();
                const result = await apiClient.get('/marketplace/payments', token);
                setData(result);
                console.log('[StudentPayments] fetchPayments success', { count: result.payments.length });
            } catch (err) {
                console.error('[StudentPayments] fetchPayments error', err);
            } finally {
                setLoading(false);
            }
        }
        fetchPayments();
    }, [getIdToken]);

    const allPayments = data?.payments ?? [];
    const totalSpent = data?.totalSpent ?? 0;
    const walletBalance = data?.walletBalance ?? 0;

    const filtered = statusFilter === 'All'
        ? allPayments
        : allPayments.filter((p) => p.status === statusFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const pendingCount = allPayments.filter((p) => p.status === 'Pending').length;
    const paidCount = allPayments.filter((p) => p.status === 'Paid').length;

    const handleFilterChange = (f: FilterStatus) => {
        setStatusFilter(f);
        setCurrentPage(1);
    };

    return (
        <DashboardLayout role="student">
            {showTopUp && (
                <TopUpModal 
                    onClose={() => setShowTopUp(false)} 
                    onSuccess={(newBalance) => {
                        if (data) {
                            setData({ ...data, walletBalance: newBalance });
                        }
                    }} 
                />
            )}
            
            <div className="space-y-6 max-w-5xl">
                {/* ── Header ──────────────────────────────────────────── */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Track all your tutor session payments and their statuses.
                    </p>
                </div>

                {/* ── Summary cards ────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Wallet Balance */}
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                        
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <Wallet className="h-7 w-7 text-indigo-200 mb-2" />
                                <p className="text-sm text-indigo-200 font-medium">Wallet Balance</p>
                                <p className="text-3xl font-bold mt-1 flex items-center gap-2">
                                    {loading ? '—' : <>{walletBalance.toLocaleString('vi-VN')} <Brain className="h-6 w-6" /></>}
                                </p>
                            </div>
                            
                            <button
                                onClick={() => setShowTopUp(true)}
                                className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors backdrop-blur-sm"
                            >
                                <Plus className="h-4 w-4" /> Buy Credits
                            </button>
                        </div>
                    </div>

                    {/* Total Spent */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-center">
                        <div className="p-3 bg-gray-50 w-fit rounded-xl mb-3">
                            <Banknote className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Total Spent</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                            {loading ? '—' : <>{totalSpent.toLocaleString('vi-VN')} <Brain className="h-4 w-4 text-indigo-600" /></>}
                        </p>
                    </div>

                    {/* Completed Sessions */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Completed Sessions</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? <span className="bg-gray-200 rounded animate-pulse block h-7 w-10" /> : paidCount}
                            </p>
                        </div>
                    </div>

                    {/* Pending Payments */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl">
                            <Clock className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Pending</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? <span className="bg-gray-200 rounded animate-pulse block h-7 w-10" /> : pendingCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Transaction table ────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Table header + filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
                        <h2 className="font-semibold text-gray-800 text-sm">Transaction History</h2>
                        <div className="flex items-center gap-2">
                            {(['All', 'Pending', 'Processing', 'Paid'] as FilterStatus[]).map((s) => (
                                <button
                                    key={s}
                                    id={`filter-${s.toLowerCase()}`}
                                    onClick={() => handleFilterChange(s)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        statusFilter === s
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : pageData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="p-5 bg-gray-50 rounded-full mb-4">
                                <ReceiptText className="h-10 w-10 text-gray-300" />
                            </div>
                            <p className="font-semibold text-gray-600">No transactions yet</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Payments will appear here once you book a session with a tutor.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tutor</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pageData.map((tx) => {
                                        const cfg = STATUS_CFG[tx.status] ?? STATUS_CFG.Pending;
                                        const StatusIcon = cfg.icon;
                                        return (
                                            <tr key={tx.id} id={`payment-row-${tx.id}`} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    <div>{new Date(tx.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}</div>
                                                    <div className="text-[10px] text-gray-400">{timeAgo(tx.createdAt)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                                    {tx.service}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="h-6 w-6 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                            {tx.teacherName[0]?.toUpperCase() ?? 'T'}
                                                        </span>
                                                        {tx.teacherName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-right">
                                                    {tx.rawStatus === 'rejected' ? (
                                                        <span className="text-gray-400 line-through flex items-center justify-end gap-1">
                                                            {tx.amount.toLocaleString('vi-VN')} <Brain className="h-4 w-4" />
                                                        </span>
                                                    ) : (
                                                        <span className="text-indigo-700 flex items-center justify-end gap-1">
                                                            {tx.amount.toLocaleString('vi-VN')} <Brain className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {tx.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                            <p className="text-xs text-gray-400">
                                Page {currentPage} of {totalPages} ({filtered.length} transactions)
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    id="payments-prev"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    id="payments-next"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Info note ───────────────────────────────────────── */}
                <p className="text-xs text-gray-400 text-center">
                    Payments are processed securely. Sessions marked <strong>Processing</strong> will move to <strong>Paid</strong> once the tutor marks the session complete.
                </p>
            </div>
        </DashboardLayout>
    );
}
