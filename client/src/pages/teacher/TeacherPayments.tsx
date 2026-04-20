import { useState } from 'react';
import TeacherLayout from '@/layouts/TeacherLayout';
import {
    Banknote,
    Download,
    ArrowDownCircle,
    TrendingUp,
    Wallet,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
} from 'lucide-react';
import { useTeacherApi, useTeacherMutation } from '@/hooks/useTeacherApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
    id: number;
    studentId: string;
    studentName: string;
    date: string;
    service: string;
    amount: number;
    status: 'Pending' | 'Cleared' | 'Withdrawn';
}

interface TransactionsResponse {
    walletBalance: number;
    transactions: Transaction[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
    Pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
    Cleared: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    Withdrawn: { color: 'bg-gray-100 text-gray-600', icon: ArrowDownCircle },
};

// ── Withdraw Modal ────────────────────────────────────────────────────────────

function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: (newBalance: number) => void }) {
    const [amount, setAmount] = useState('');
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { post, loading } = useTeacherMutation();

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[WithdrawModal] handleWithdraw called', { amount });
        setErrorMsg(null);
        try {
            const result = await post('/teacher/withdraw', { amount: parseFloat(amount) });
            setSuccess(true);
            onSuccess(result.newBalance);
            console.log('[WithdrawModal] handleWithdraw success', result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Withdrawal failed';
            setErrorMsg(msg);
            console.error('[WithdrawModal] handleWithdraw error', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Withdraw Funds</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {success ? (
                    <div className="px-6 py-10 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <p className="font-semibold text-gray-800 text-lg">Withdrawal Requested</p>
                        <p className="text-gray-500 text-sm mt-1">Your withdrawal of {parseFloat(amount).toLocaleString('vi-VN')} VND has been submitted. Processing takes 1–3 business days.</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleWithdraw} className="px-6 py-5 space-y-4">
                        {errorMsg && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{errorMsg}</div>
                        )}
                        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                            <Wallet className="h-6 w-6 text-emerald-600" />
                            <div>
                                <p className="text-xs text-emerald-600 font-medium">Available Balance</p>
                                <p className="text-xl font-bold text-emerald-700">{balance.toLocaleString('vi-VN')} VND</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount to Withdraw (VND)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-[55%] text-gray-400 font-medium">₫</span>
                                <input
                                    id="withdraw-amount"
                                    type="number"
                                    min="1"
                                    max={balance}
                                    step="0.01"
                                    placeholder={`Max: ${balance.toLocaleString('vi-VN')} VND`}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payout Method</label>
                            <select
                                id="withdraw-method"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option>Bank Transfer (ACH)</option>
                                <option>PayPal</option>
                                <option>Stripe Connect</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                id="confirm-withdraw"
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Withdraw
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export default function TeacherPayments() {
    console.log('[TeacherPayments] render called');

    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Cleared' | 'Withdrawn'>('All');
    const [liveBalance, setLiveBalance] = useState<number | null>(null);

    const { data, loading } = useTeacherApi<TransactionsResponse>('/teacher/transactions');

    const allTransactions = data?.transactions ?? [];
    const walletBalance = liveBalance ?? data?.walletBalance ?? 0;

    const filtered = statusFilter === 'All' ? allTransactions : allTransactions.filter((t) => t.status === statusFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const totalCleared = allTransactions.filter((t) => t.status === 'Cleared').reduce((sum, t) => sum + t.amount, 0);
    const totalPending = allTransactions.filter((t) => t.status === 'Pending').reduce((sum, t) => sum + t.amount, 0);

    return (
        <TeacherLayout>
            {showWithdrawModal && (
                <WithdrawModal
                    balance={walletBalance}
                    onClose={() => setShowWithdrawModal(false)}
                    onSuccess={(newBalance) => setLiveBalance(newBalance)}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage your wallet and transaction history.</p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Wallet */}
                    <div className="sm:col-span-1 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                        <Wallet className="h-7 w-7 text-indigo-200 mb-3 relative z-10" />
                        <p className="text-sm text-indigo-200 font-medium">Wallet Balance</p>
                        <p className="text-3xl font-bold mt-1 relative z-10">
                            {loading ? '—' : `${walletBalance.toLocaleString('vi-VN')} VND`}
                        </p>
                        <button
                            id="open-withdraw"
                            onClick={() => setShowWithdrawModal(true)}
                            className="mt-4 flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-colors relative z-10"
                        >
                            <Download className="h-4 w-4" /> Withdraw
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? <span className="bg-gray-200 rounded animate-pulse block h-7 w-20" /> : `${totalCleared.toLocaleString('vi-VN')} VND`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Pending Clearance</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? <span className="bg-gray-200 rounded animate-pulse block h-7 w-20" /> : `${totalPending.toLocaleString('vi-VN')} VND`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transaction ledger */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
                        <h2 className="font-semibold text-gray-800 text-sm">Transaction History</h2>
                        <div className="flex items-center gap-2">
                            {(['All', 'Pending', 'Cleared', 'Withdrawn'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
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

                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : pageData.length === 0 ? (
                        <div className="text-center py-14">
                            <Banknote className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No transactions found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pageData.map((tx) => {
                                        const statusCfg = STATUS_CFG[tx.status] ?? STATUS_CFG.Cleared;
                                        const StatusIcon = statusCfg.icon;
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {new Date(tx.date).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{tx.service}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="h-6 w-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                                            {tx.studentName?.[0]?.toUpperCase() ?? 'S'}
                                                        </span>
                                                        {tx.studentName ?? tx.studentId.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                                                    +{tx.amount.toLocaleString('vi-VN')} VND
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.color}`}>
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
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
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
            </div>
        </TeacherLayout>
    );
}
