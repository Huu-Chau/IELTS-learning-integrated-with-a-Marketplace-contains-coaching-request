import TeacherLayout from '@/layouts/TeacherLayout';
import {
    Banknote,
    Users,
    Star,
    ShoppingBag,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Brain,
} from 'lucide-react';
import { useTeacherApi } from '@/hooks/useTeacherApi';
import { Link } from 'react-router-dom';

interface TeacherStats {
    monthlyEarnings: number;
    pendingOrders: number;
    activeStudents: number;
    avgRating: number;
    unreadMessages: number;
    unreadNotifications: number;
}

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

// Skeleton loader card
function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-10 w-10 rounded-xl bg-gray-200" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-20 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
    );
}

export default function TeacherDashboardPage() {
    console.log('[TeacherDashboardPage] render called');

    const { data: stats, loading: statsLoading } = useTeacherApi<TeacherStats>('/teacher/stats');
    const { data: transactionData, loading: transactionsLoading } = useTeacherApi<TransactionsResponse>('/teacher/transactions');

    const recentTransactions = transactionData?.transactions?.slice(0, 4) ?? [];

    const kpiCards = stats
        ? [
              {
                  label: 'Wallet Balance',
                  value: <div className="flex items-center gap-1.5">{(stats.monthlyEarnings ?? 0).toLocaleString('vi-VN')} <Brain className="h-6 w-6" /></div>,
                  icon: Banknote,
                  gradient: 'from-emerald-500 to-teal-500',
                  bg: 'bg-emerald-50',
                  text: 'text-emerald-600',
                  sub: 'Total balance',
              },
              {
                  label: 'Pending Orders',
                  value: stats.pendingOrders,
                  icon: ShoppingBag,
                  gradient: 'from-orange-500 to-amber-500',
                  bg: 'bg-orange-50',
                  text: 'text-orange-600',
                  sub: 'Awaiting your response',
              },
              {
                  label: 'Active Students',
                  value: stats.activeStudents,
                  icon: Users,
                  gradient: 'from-blue-500 to-indigo-500',
                  bg: 'bg-blue-50',
                  text: 'text-blue-600',
                  sub: 'Sessions in progress',
              },
          ]
        : [];

    return (
        <TeacherLayout
            unreadMessages={stats?.unreadMessages ?? 0}
            unreadNotifications={stats?.unreadNotifications ?? 0}
        >
            <div className="space-y-8">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Good morning! 👋</h1>
                        <p className="text-gray-500 mt-1 text-sm">Here's what's happening with your students today.</p>
                    </div>
                    <Link
                        to="/teacher/marketplace"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        Manage Listings <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* ── KPI Cards ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-5">
                    {statsLoading
                        ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                        : kpiCards.map((card) => (
                              <div
                                  key={card.label}
                                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              >
                                  <div className="flex items-center justify-between mb-4">
                                      <p className="text-sm font-medium text-gray-500">{card.label}</p>
                                      <div className={`p-2.5 rounded-xl ${card.bg}`}>
                                          <card.icon className={`h-5 w-5 ${card.text}`} />
                                      </div>
                                  </div>
                                  <p className="text-3xl font-bold text-gray-900 mb-0.5">{card.value}</p>
                                  <p className="text-xs text-gray-400">{card.sub}</p>
                              </div>
                          ))}
                </div>

                {/* ── Action Inbox + Quick Stats row ───────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity list */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                            <h2 className="font-semibold text-gray-800 text-sm">Recent Activity</h2>
                            <Link
                                to="/teacher/payments"
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        {transactionsLoading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                <CheckCircle className="h-10 w-10 text-emerald-400 mb-3" />
                                <p className="font-medium text-gray-700">No recent activity.</p>
                                <p className="text-sm text-gray-400 mt-0.5">Your completed and pending sessions will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 flex-1">
                                {recentTransactions.map((tx) => {
                                    const serviceName = (tx.service || '').toLowerCase();
                                    let char = 'T';
                                    let colorClass = 'text-gray-700 bg-gray-100';

                                    if (serviceName.includes('reading')) {
                                        char = 'R';
                                        colorClass = 'text-blue-700 bg-blue-100';
                                    } else if (serviceName.includes('listening')) {
                                        char = 'L';
                                        colorClass = 'text-teal-700 bg-teal-100';
                                    } else if (serviceName.includes('speaking')) {
                                        char = 'S';
                                        colorClass = 'text-violet-700 bg-violet-100';
                                    } else if (serviceName.includes('writing')) {
                                        char = 'W';
                                        colorClass = 'text-amber-700 bg-amber-100';
                                    }

                                    return (
                                        <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${colorClass}`}>
                                                    {char}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{tx.service || 'Tutor Session'}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        Student: {tx.studentName ?? tx.studentId.slice(0, 8)} • {new Date(tx.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                tx.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                                tx.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick-action sidebar */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
                            <TrendingUp className="h-8 w-8 text-indigo-200 mb-3" />
                            <p className="font-semibold text-lg leading-tight">Grow your business</p>
                            <p className="text-indigo-200 text-xs mt-1.5 mb-4">
                                Add more service listings to attract students looking for your expertise.
                            </p>
                            <Link
                                to="/teacher/marketplace"
                                className="block text-center text-sm font-semibold bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl transition-colors"
                            >
                                + Create Listing
                            </Link>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'View payments', path: '/teacher/payments', icon: Banknote },
                                    { label: 'Open messages', path: '/teacher/messages', icon: Users },
                                    { label: 'Notifications', path: '/teacher/notifications', icon: Star },
                                ].map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className="flex items-center gap-3 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                        <ArrowRight className="h-3 w-3 ml-auto" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TeacherLayout>
    );
}
