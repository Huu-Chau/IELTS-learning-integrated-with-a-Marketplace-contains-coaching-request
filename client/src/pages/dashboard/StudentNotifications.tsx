import DashboardLayout from '@/layouts/DashboardLayout';
import {
    Bell,
    ShoppingBag,
    DollarSign,
    MessageSquare,
    Star,
    Info,
    CheckCheck,
    Loader2,
    ArrowRight,
    Trophy,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL as string;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
    id: string; // String because some are 'db-1', 'attempt-1', 'marketplace-1'
    type: 'attempt' | 'marketplace' | 'order' | 'payment' | 'message' | 'review' | 'system';
    title: string;
    body: string;
    linkPath: string | null;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

// ── Notification type config ──────────────────────────────────────────────────

const TYPE_CFG: Record<
    Notification['type'],
    { icon: React.ElementType; color: string; bg: string; label: string }
> = {
    attempt: { icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Test Result' },
    marketplace: { icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Marketplace' },
    order: { icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Order' },
    payment: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Payment' },
    message: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Message' },
    review: { icon: Star, color: 'text-violet-600', bg: 'bg-violet-100', label: 'Review' },
    system: { icon: Info, color: 'text-gray-500', bg: 'bg-gray-100', label: 'System' },
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentNotifications() {
    console.log('[StudentNotifications] render called');

    const { getIdToken, user } = useAuth();
    const [data, setData] = useState<NotificationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getIdToken();
            const res = await apiClient.get('/notifications', token);
            setData(res);
        } catch (err) {
            console.error('[StudentNotifications] fetchNotifications error', err);
        } finally {
            setLoading(false);
        }
    }, [getIdToken]);

    // ── Real-time: socket + polling ──────────────────────────────────────────
    const socketRef = useRef<Socket | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Initial fetch on mount
        fetchNotifications();

        // Connect to Socket.io and join the user's personal room
        const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        // Join the room — also handles reconnections after dropped connections.
        // If user?.uid is null (auth still loading), this effect will re-run
        // once it resolves because user?.uid is in the dependency array.
        const joinRoom = () => {
            if (user?.uid) socket.emit('join_user_room', user.uid);
        };
        socket.on('connect', () => {
            console.log('[StudentNotifications] socket connected', { id: socket.id });
            joinRoom();
        });
        socket.on('reconnect', () => {
            console.log('[StudentNotifications] socket reconnected — rejoining room');
            joinRoom();
        });

        // Server emits this after a booking is confirmed — wait 1.5s for the
        // Kafka consumer to write the notification to DB before refetching.
        // Cancel any pending timeout to avoid duplicate fetches.
        socket.on('new_notification', () => {
            console.log('[StudentNotifications] new_notification event received — refetching in 1.5s');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(fetchNotifications, 1500);
        });

        // Fallback polling every 30s for notifications created by background
        // workers (cron jobs, writing evaluations) that don't emit socket events.
        const pollInterval = setInterval(fetchNotifications, 30_000);

        return () => {
            socket.disconnect();
            clearInterval(pollInterval);
            // Cancel pending timeout so setState isn't called after unmount
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            console.log('[StudentNotifications] socket disconnected, polling cleared');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]); // fetchNotifications intentionally omitted — stable across renders

    const notifications = data?.notifications ?? [];
    const unreadCount = data?.unreadCount ?? 0;

    const handleMarkAllRead = async () => {
        console.log('[StudentNotifications] handleMarkAllRead called');
        setMarking(true);
        try {
            const token = await getIdToken();
            await apiClient.patch('/notifications/read-all', {}, token);
            await fetchNotifications();
            console.log('[StudentNotifications] handleMarkAllRead success');
        } catch (err) {
            console.error('[StudentNotifications] handleMarkAllRead error', err);
        } finally {
            setMarking(false);
        }
    };

    return (
        <DashboardLayout role="student">
            <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            id="mark-all-read"
                            onClick={handleMarkAllRead}
                            disabled={marking}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                        >
                            {marking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCheck className="h-4 w-4 text-indigo-500" />
                            )}
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Notification list */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                                        <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="p-5 bg-gray-50 rounded-full mb-4">
                                <Bell className="h-10 w-10 text-gray-300" />
                            </div>
                            <p className="font-semibold text-gray-600">No notifications yet</p>
                            <p className="text-sm text-gray-400 mt-1">You'll be notified of test results, session reminders, and marketplace updates here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {notifications.map((notif) => {
                                const cfg = TYPE_CFG[notif.type] ?? TYPE_CFG.system;
                                const Icon = cfg.icon;

                                return (
                                    <div
                                        key={notif.id}
                                        id={`notif-${notif.id}`}
                                        className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50/70 ${
                                            !notif.isRead ? 'bg-indigo-50/30' : ''
                                        }`}
                                    >
                                        {/* Icon */}
                                        <div className={`p-2.5 rounded-full flex-shrink-0 ${cfg.bg}`}>
                                            <Icon className={`h-5 w-5 ${cfg.color}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    {!notif.isRead && (
                                                        <span className="h-2 w-2 bg-indigo-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                                    {timeAgo(notif.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                                            {notif.linkPath && (
                                                <Link
                                                    to={notif.linkPath}
                                                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1.5 transition-colors"
                                                >
                                                    View details <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer info */}
                {notifications.length > 0 && (
                    <p className="text-center text-xs text-gray-400">
                        Showing your last {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </DashboardLayout>
    );
}
