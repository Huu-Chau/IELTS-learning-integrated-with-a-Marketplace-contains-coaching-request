import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Store,
    CreditCard,
    MessageSquare,
    Bell,
    LogOut,
    GraduationCap,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
    badgeKey?: 'unreadMessages' | 'unreadNotifications';
}

const TEACHER_NAV: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: Store, label: 'Marketplace', path: '/teacher/marketplace' },
    { icon: CreditCard, label: 'Payments', path: '/teacher/payments' },
    { icon: MessageSquare, label: 'Messages', path: '/teacher/messages', badgeKey: 'unreadMessages' },
    { icon: Bell, label: 'Notifications', path: '/teacher/notifications', badgeKey: 'unreadNotifications' },
];

interface TeacherLayoutProps {
    children: React.ReactNode;
    /** Unread counts for badge display on nav items */
    unreadMessages?: number;
    unreadNotifications?: number;
}

export default function TeacherLayout({ children, unreadMessages = 0, unreadNotifications = 0 }: TeacherLayoutProps) {
    console.log('[TeacherLayout] render called', { unreadMessages, unreadNotifications });

    // Default closed on mobile, open on desktop (lg = 1024px)
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, getIdToken } = useAuth();

    // Auto open/close when window crosses the lg breakpoint
    useEffect(() => {
        const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Self-fetch live unread counts on mount so the bell dot is always accurate
    const [liveUnreadNotifications, setLiveUnreadNotifications] = useState(unreadNotifications);
    const [liveUnreadMessages, setLiveUnreadMessages] = useState(unreadMessages);

    useEffect(() => {
        if (!user) return;
        async function fetchStats() {
            try {
                console.log('[TeacherLayout] fetchStats called');
                const token = await getIdToken();
                const stats = await apiClient.get('/teacher/stats', token);
                setLiveUnreadNotifications(stats.unreadNotifications ?? 0);
                setLiveUnreadMessages(stats.unreadMessages ?? 0);
                console.log('[TeacherLayout] fetchStats success', { stats });
            } catch (err) {
                console.error('[TeacherLayout] fetchStats error', err);
            }
        }
        fetchStats();
        // Refresh every 30 s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [user, getIdToken]);

    const badgeCounts: Record<string, number> = {
        unreadMessages: liveUnreadMessages,
        unreadNotifications: liveUnreadNotifications,
    };

    const handleLogout = async () => {
        console.log('[TeacherLayout] handleLogout called');
        try {
            await logout();
            navigate('/login');
            console.log('[TeacherLayout] handleLogout success');
        } catch (error) {
            console.error('[TeacherLayout] handleLogout error', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-gradient-to-b from-indigo-950 to-indigo-900 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
                    !isSidebarOpen && '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-indigo-800/60">
                    <GraduationCap className="h-7 w-7 text-indigo-300 mr-2.5" />
                    <span className="text-lg font-bold text-white tracking-tight">
                        IELTS <span className="text-indigo-300">Hybrid</span>
                    </span>
                </div>

                {/* Teacher profile micro-card */}
                <div className="px-4 py-4 border-b border-indigo-800/40">
                    <div className="flex items-center gap-3 bg-indigo-800/40 rounded-xl p-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-sm font-bold text-white shadow-inner flex-shrink-0">
                            {user?.email?.[0]?.toUpperCase() ?? 'T'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {user?.displayName ?? user?.email?.split('@')[0] ?? 'Teacher'}
                            </p>
                            <p className="text-xs text-indigo-300 truncate">Expert Tutor</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest px-3 mb-3">
                        Teacher Workspace
                    </p>
                    {TEACHER_NAV.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                                    isActive
                                        ? 'bg-white/15 text-white shadow-sm'
                                        : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                <Icon
                                    className={cn(
                                        'h-5 w-5 mr-3 flex-shrink-0 transition-colors',
                                        isActive ? 'text-white' : 'text-indigo-400 group-hover:text-white'
                                    )}
                                />
                                <span className="flex-1">{item.label}</span>
                                {/* Unread badge */}
                                {badgeCount > 0 && (
                                    <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </span>
                                )}
                                {isActive && badgeCount === 0 && (
                                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-300 opacity-60" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sign out */}
                <div className="p-3 border-t border-indigo-800/40">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-indigo-300 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ── Main content ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <button
                        id="teacher-sidebar-toggle"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    {/* Page breadcrumb / title */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400 hidden lg:block">
                            {TEACHER_NAV.find((n) => n.path === location.pathname)?.label ?? 'Teacher'}
                        </span>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        {/* Notification bell shortcut */}
                        <Link
                            to="/teacher/notifications"
                            id="teacher-notification-bell"
                            className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                        >
                            <Bell className="h-5 w-5" />
                            {liveUnreadNotifications > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
                            )}
                        </Link>

                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-white">
                                {user?.email?.[0]?.toUpperCase() ?? 'T'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
