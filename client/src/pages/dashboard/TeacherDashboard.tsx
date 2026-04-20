
import DashboardLayout from '@/layouts/DashboardLayout';
import { DollarSign, Star, Users, Video } from 'lucide-react';

export default function TeacherDashboard() {
    return (
        <DashboardLayout role="teacher">
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hello, Professor!</h1>
                    <p className="text-gray-500 mt-1">Manage your schedule and students effectively.</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Earnings', value: '$1,240', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
                        { label: 'Active Students', value: '18', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
                        { label: 'Rating', value: '4.9/5.0', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
                            <div className={`p-3 rounded-full ${stat.bg} mr-4`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upcoming Sessions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Upcoming Sessions</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[
                                    { name: 'Alice Smith', topic: 'Speaking Part 2', time: 'Today, 2:00 PM', status: 'Confirmed', img: 'https://ui-avatars.com/api/?name=Alice+Smith&background=random' },
                                    { name: 'John Doe', topic: 'Writing Task 1 Review', time: 'Tomorrow, 10:00 AM', status: 'Pending', img: 'https://ui-avatars.com/api/?name=John+Doe&background=random' },
                                ].map((session, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-8 w-8 rounded-full" src={session.img} alt="" />
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{session.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.topic}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.time}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end w-full">
                                                <Video className="h-4 w-4 mr-1" /> Join
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
