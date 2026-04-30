import { useEffect, useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ArrowUpRight, Book, Clock, Target, Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

const StatCard = ({ title, value, label, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                {label}
            </span>
            <span className="text-gray-400 ml-2">vs last month</span>
        </div>
    </div>
);

export default function StudentDashboard() {
    const { user, getIdToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({
        practiceTests: 0,
        currentLevel: 'N/A',
        studyHours: 0,
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const token = await getIdToken();
                if (!token) return;

                // 1. Fetch Profile
                const profileData = await apiClient.get('/users/me', token);
                setProfile(profileData);

                // 2. Fetch Attempts
                const attemptsData = await apiClient.get(`/attempts/user/${user.uid}`, token);
                
                // 3. Fetch Payments / Bookings
                const paymentsRes = await apiClient.get('/marketplace/payments', token);
                const paymentsData = paymentsRes.payments || [];

                // Compute Stats
                const numTests = attemptsData.length;
                let currentLevel = 'N/A';
                
                // Try to find the latest scored attempt
                const scoredAttempts = attemptsData.filter((a: any) => a.score !== null && a.score !== undefined);
                if (scoredAttempts.length > 0) {
                    currentLevel = Number(scoredAttempts[0].score).toFixed(1);
                }

                // Rough mock for study hours: 0.5h per attempt + 1h per completed booking
                const testHours = numTests * 0.5;
                const classHours = paymentsData.filter((p: any) => p.status === 'Paid').length * 1.0;
                const totalHours = Math.round(testHours + classHours);

                setStats({
                    practiceTests: numTests,
                    currentLevel,
                    studyHours: totalHours,
                });

                // Merge and sort recent activity
                const activities: any[] = [];
                
                attemptsData.forEach((a: any) => {
                    const testType = a.type === 'speaking' ? 'Speaking' : a.type === 'writing' ? 'Writing' : 'Practice';
                    activities.push({
                        title: `${testType} Test`,
                        score: a.score !== null ? Number(a.score).toFixed(1) : 'Pending',
                        date: new Date(a.createdAt),
                        type: 'Test',
                        iconChar: testType[0],
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50',
                    });
                });

                paymentsData.forEach((p: any) => {
                    activities.push({
                        title: p.service,
                        score: p.status,
                        date: new Date(p.createdAt),
                        type: `Tutor: ${p.teacherName}`,
                        iconChar: 'C',
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                    });
                });

                activities.sort((a, b) => b.date.getTime() - a.date.getTime());
                
                // Format dates
                const formattedActivities = activities.slice(0, 4).map(act => {
                    const diffDays = Math.floor((new Date().getTime() - act.date.getTime()) / (1000 * 3600 * 24));
                    let dateStr = `${diffDays} days ago`;
                    if (diffDays === 0) dateStr = 'Today';
                    if (diffDays === 1) dateStr = 'Yesterday';

                    return {
                        ...act,
                        dateStr,
                    };
                });

                setRecentActivity(formattedActivities);
            } catch (err) {
                console.error('[StudentDashboard] Error fetching data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, getIdToken]);

    const firstName = profile?.firstName || profile?.name || 'Student';

    return (
        <DashboardLayout role="student">
            {loading ? (
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="space-y-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
                        <p className="text-gray-500 mt-1">Here's your preparation overview for today.</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Target Band"
                            value="7.5" // MOCKED
                            label="+0.5"
                            icon={Target}
                            color="bg-indigo-500"
                        />
                        <StatCard
                            title="Practice Tests"
                            value={stats.practiceTests.toString()}
                            label={stats.practiceTests > 0 ? '+1' : '0'}
                            icon={Book}
                            color="bg-blue-500"
                        />
                        <StatCard
                            title="Study Hours"
                            value={`${stats.studyHours}h`}
                            label="Steady"
                            icon={Clock}
                            color="bg-orange-500"
                        />
                        <StatCard
                            title="Current Level"
                            value={stats.currentLevel}
                            label={stats.currentLevel !== 'N/A' ? 'Current' : 'Need tests'}
                            icon={Trophy}
                            color="bg-green-500"
                        />
                    </div>

                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 gap-8">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                            </div>
                            <div className="divide-y divide-gray-100 flex-1">
                                {recentActivity.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">
                                        No recent activity. Take a test to get started!
                                    </div>
                                ) : (
                                    recentActivity.map((item, i) => (
                                        <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} font-bold`}>
                                                    {item.iconChar}
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                    <p className="text-xs text-gray-500">{item.type} • {item.dateStr}</p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                item.score === 'Pending' || item.score === 'Processing'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {item.score}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
