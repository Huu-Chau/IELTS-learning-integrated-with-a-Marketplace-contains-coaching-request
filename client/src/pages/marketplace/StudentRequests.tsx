import DashboardLayout from '@/layouts/DashboardLayout';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StudentRequests() {
    return (
        <DashboardLayout role="teacher">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Requests</h1>
                    <p className="text-gray-500 mt-1">Review and accept consultation requests from students.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {[
                            { id: 1, student: 'Michael Brown', type: 'Writing Correction', message: 'I need help reviewing my Task 2 essay on environment.', date: 'Today, 9:30 AM', budget: '$15' },
                            { id: 2, student: 'Lisa Wang', type: 'Speaking Practice', message: 'Looking for a 30-min mock test for Part 2 and 3.', date: 'Yesterday, 4:15 PM', budget: '$20' },
                            { id: 3, student: 'Ahmed Hassan', type: 'General Consultation', message: 'Need a study plan for 1 month preparation.', date: 'Oct 24, 11:00 AM', budget: '$25' },
                        ].map((request) => (
                            <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex items-start">
                                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
                                            {request.student[0]}
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-base font-semibold text-gray-900">{request.student}</h3>
                                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                                                <span className="flex items-center"><MessageSquare className="h-3 w-3 mr-1" /> {request.type}</span>
                                                <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {request.date}</span>
                                            </div>
                                            <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                                "{request.message}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2 ml-16 md:ml-0">
                                        <span className="text-lg font-bold text-indigo-600">{request.budget}</span>
                                        <div className="flex space-x-2">
                                            <button className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                                                <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                                            </button>
                                            <button className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                                                <XCircle className="h-4 w-4 mr-1.5" /> Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
