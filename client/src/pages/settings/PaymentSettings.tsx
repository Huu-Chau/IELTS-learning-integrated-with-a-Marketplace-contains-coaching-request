
import DashboardLayout from '@/layouts/DashboardLayout';
import { CreditCard, Plus, Trash2 } from 'lucide-react';

export default function PaymentSettings() {
    return (
        <DashboardLayout role="student">
            <div className="space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
                    <p className="text-gray-500 mt-1">Manage your saved cards and billing details.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900">Saved Cards</h2>
                        <button className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                            <Plus className="h-4 w-4 mr-1" /> Add New Card
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center">
                                <div className="h-10 w-16 bg-gray-100 rounded flex items-center justify-center mr-4">
                                    <CreditCard className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Visa ending in 4242</p>
                                    <p className="text-sm text-gray-500">Expires 12/28 • Default</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center">
                                <div className="h-10 w-16 bg-gray-100 rounded flex items-center justify-center mr-4">
                                    <div className="font-bold text-xs text-gray-500">MASTERCARD</div>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Mastercard ending in 8899</p>
                                    <p className="text-sm text-gray-500">Expires 09/25</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 text-blue-800 p-6 rounded-xl flex items-start">
                    <div className="mr-4 mt-1">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Billing History</h3>
                        <p className="text-blue-600/80 text-sm mt-1">
                            Your recent transactions will appear here after you make your first purchase.
                            You can download invoices for all completed sessions.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
