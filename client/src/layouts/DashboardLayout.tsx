import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    MessageSquare,
    Settings,
    Users,
    LogOut,
    GraduationCap,
    TrendingUp,
    DollarSign,
    ShieldAlert,
    Menu,
    X,
    Bell,
    ChevronDown,
    Headphones,
    BookMarked,
    Pen,
    Mic,
    ClipboardList,
    Timer,
    CheckCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

type UserRole = 'student' | 'teacher' | 'admin';

interface SidebarItem {
    icon: React.ElementType;
    label: string;
    path: string;
    disabled?: boolean;
}


// Sub-items for the Mock Test dropdown (timed exam simulation)
const MOCK_TEST_ITEMS: SidebarItem[] = [
    { icon: BookMarked, label: 'Reading', path: '/mock-test/reading' },
    { icon: Headphones, label: 'Listening', path: '/mock-test/listening' },
    { icon: Pen, label: 'Writing', path: '/mock-test/writing' },
    { icon: Mic, label: 'Speaking', path: '/mock-test/speaking' },
];

const getNavItems = (role: UserRole): SidebarItem[] => {
    switch (role) {
        case 'student':
            return [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/student' },
                { icon: BookOpen, label: 'Vocabulary', path: '/vocabulary' },
                { icon: Users, label: 'Find Tutors', path: '/marketplace' },
                { icon: ClipboardList, label: 'My Requests', path: '/my-requests' },
                { icon: MessageSquare, label: 'Messages', path: '/messages' },
                { icon: DollarSign, label: 'Payments', path: '/payments' },
                { icon: TrendingUp, label: 'Progress', path: '/progress' },
            ];
        case 'teacher':
            return [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/teacher' },
                { icon: Users, label: 'My Students', path: '/students' },
                { icon: Calendar, label: 'Schedule', path: '/schedule' },
                { icon: DollarSign, label: 'Earnings', path: '/earnings' },
                { icon: MessageSquare, label: 'Requests', path: '/requests' },
            ];
        case 'admin':
            return [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/admin' },
                { icon: Users, label: 'Users', path: '/admin/users' },
                { icon: ShieldAlert, label: 'Reports', path: '/admin/reports' },
                { icon: Settings, label: 'System', path: '/admin/system' },
            ];
        default:
            return [];
    }
};

interface DashboardLayoutProps {
    children: React.ReactNode;
    role: UserRole;
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, getIdToken } = useAuth();

    const safeRole = role || 'student';
    const navItems = getNavItems(safeRole);

    // Auto-expand Mock Test dropdown when on a /mock-test/* route
    const onMockTestPath = location.pathname.startsWith('/mock-test');
    const [isMockTestOpen, setIsMockTestOpen] = useState(onMockTestPath);

    // ── Notification state ────────────────────────────────────────────────
    interface NotificationItem {
        id: string;
        type: 'attempt' | 'marketplace';
        title: string;
        body: string;
        linkPath: string;
        isRead: boolean;
        createdAt: string;
    }

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Fetch notifications when bell is opened (student role only)
    useEffect(() => {
        if (!notifOpen || safeRole !== 'student') return;
        let cancelled = false;

        async function fetchNotifications() {
            console.log('[DashboardLayout] fetchNotifications called');
            setNotifLoading(true);
            try {
                const token = await getIdToken?.();
                const data = await apiClient.get('/notifications', token);
                if (!cancelled) {
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unreadCount || 0);
                    console.log('[DashboardLayout] fetchNotifications success', { count: data.notifications?.length });
                }
            } catch (err) {
                console.error('[DashboardLayout] fetchNotifications error', err);
            } finally {
                if (!cancelled) setNotifLoading(false);
            }
        }

        fetchNotifications();
        return () => { cancelled = true; };
    }, [notifOpen, safeRole]);

    // Eagerly load unread count on mount (student only)
    useEffect(() => {
        if (safeRole !== 'student' || !user) return;
        async function fetchCount() {
            try {
                const token = await getIdToken?.();
                const data = await apiClient.get('/notifications', token);
                setUnreadCount(data.unreadCount || 0);
            } catch { /* silent */ }
        }
        fetchCount();
    }, [safeRole, user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function timeAgo(dateStr: string): string {
        const now = Date.now();
        const d = new Date(dateStr).getTime();
        const diffMs = now - d;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col",
                    !isSidebarOpen && "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="h-16 shrink-0 flex items-center px-6 border-b border-gray-100">
                    <GraduationCap className="h-8 w-8 text-indigo-600 mr-2" />
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        IELTS Hybrid
                    </span>
                </div>

                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
                        {safeRole.toUpperCase()} WORKSPACE
                    </div>

                    {/* Dashboard link (always first) */}
                    {navItems.slice(0, 1).map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 mr-3", isActive ? "text-indigo-600" : "text-gray-400")} />
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* ── Mock Test Dropdown (student only) ──────────────────── */}
                    {safeRole === 'student' && (
                        <div>
                            <button
                                onClick={() => setIsMockTestOpen(prev => !prev)}
                                className={cn(
                                    "w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    onMockTestPath
                                        ? "bg-violet-50 text-violet-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <ClipboardList className={cn("h-5 w-5 mr-3", onMockTestPath ? "text-violet-600" : "text-gray-400")} />
                                Mock Test
                                <ChevronDown
                                    className={cn(
                                        "ml-auto h-4 w-4 transition-transform duration-200",
                                        isMockTestOpen ? "rotate-180" : "rotate-0",
                                        onMockTestPath ? "text-violet-500" : "text-gray-400"
                                    )}
                                />
                            </button>

                            <div
                                className={cn(
                                    "overflow-hidden transition-all duration-300 ease-in-out",
                                    isMockTestOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                                )}
                            >
                                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-violet-100 pl-3">
                                    {MOCK_TEST_ITEMS.map((sub) => {
                                        const SubIcon = sub.icon;
                                        const isActive = location.pathname === sub.path;

                                        if (sub.disabled) {
                                            return (
                                                <div
                                                    key={sub.path}
                                                    className="flex items-center px-3 py-2.5 text-sm rounded-lg text-gray-300 cursor-not-allowed select-none"
                                                    title="Coming soon"
                                                >
                                                    <SubIcon className="h-4 w-4 mr-2.5 text-gray-300" />
                                                    {sub.label}
                                                    <span className="ml-auto text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                                                        Soon
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={sub.path}
                                                to={sub.path}
                                                className={cn(
                                                    "flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors font-medium",
                                                    isActive
                                                        ? "bg-violet-50 text-violet-600"
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                            >
                                                <SubIcon className={cn("h-4 w-4 mr-2.5", isActive ? "text-violet-500" : "text-gray-400")} />
                                                {sub.label}
                                                <Timer className="ml-auto h-3.5 w-3.5 text-violet-400" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Remaining nav items (Find Tutors, Schedule, Progress…) */}
                    {navItems.slice(1).map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 mr-3", isActive ? "text-indigo-600" : "text-gray-400")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sign out */}
                <div className="mt-auto shrink-0 w-full p-4 border-t border-gray-100 bg-white z-10 relative">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                    >
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center space-x-4">
                        {/* Notification Bell — student only */}
                        {safeRole === 'student' && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    id="notification-bell"
                                    onClick={() => setNotifOpen(prev => !prev)}
                                    className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-6 w-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
                                    )}
                                </button>

                                {/* Dropdown panel */}
                                {notifOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-800">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>

                                        {/* Body */}
                                        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                                            {notifLoading ? (
                                                <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
                                            ) : notifications.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <CheckCheck className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">You're all caught up!</p>
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <button
                                                        key={n.id}
                                                        onClick={() => { setNotifOpen(false); navigate(n.linkPath); }}
                                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${
                                                            !n.isRead ? 'bg-indigo-50/40' : ''
                                                        }`}
                                                    >
                                                        {/* Icon dot */}
                                                        <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                                            n.type === 'attempt' ? 'bg-violet-500' : 'bg-indigo-500'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-gray-100 px-4 py-2.5 flex gap-3">
                                            <button
                                                onClick={() => { setNotifOpen(false); navigate('/progress'); }}
                                                className="text-xs text-indigo-600 font-semibold hover:underline"
                                            >
                                                View Progress
                                            </button>
                                            <span className="text-gray-200">·</span>
                                            <button
                                                onClick={() => { setNotifOpen(false); navigate('/my-requests'); }}
                                                className="text-xs text-indigo-600 font-semibold hover:underline"
                                            >
                                                My Requests
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Non-student: simple static bell */}
                        {safeRole !== 'student' && (
                            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                                <Bell className="h-6 w-6" />
                            </button>
                        )}
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                            <span className="text-sm font-medium text-indigo-600">
                                {safeRole[0].toUpperCase()}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-scroll">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
