
import DashboardLayout from '@/layouts/DashboardLayout';
import { Activity, AlertTriangle, CheckCircle, Server } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <DashboardLayout role="admin">
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
                    <p className="text-gray-500 mt-1">Monitoring platform health and activity.</p>
                </div>

                {/* System Health Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex items-center">
                        <div className="p-3 bg-emerald-100 rounded-lg mr-4">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-emerald-900">API Status</h3>
                            <p className="text-lg font-bold text-emerald-700">Operational</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex items-center">
                        <div className="p-3 bg-blue-100 rounded-lg mr-4">
                            <Server className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-900">Server Load</h3>
                            <p className="text-lg font-bold text-blue-700">24%</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-6 rounded-xl flex items-center">
                        <div className="p-3 bg-gray-100 rounded-lg mr-4">
                            <Activity className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                            <p className="text-lg font-bold text-gray-900">1,204</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl flex items-center">
                        <div className="p-3 bg-amber-100 rounded-lg mr-4">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-amber-900">Pending Reports</h3>
                            <p className="text-lg font-bold text-amber-700">3</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-4">Traffic Overview</h3>
                        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                            [Chart Area Placeholder]
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                                Approve New Teachers
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                                Review Content Flags
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                                System Maintenance
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
