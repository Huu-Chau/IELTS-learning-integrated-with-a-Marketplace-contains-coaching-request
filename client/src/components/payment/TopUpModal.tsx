import { useState } from 'react';
import { X, Brain, CheckCircle, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

interface TopUpModalProps {
    onClose: () => void;
    onSuccess: (newBalance: number) => void;
}

const PACKAGES = [
    { credits: 10, price: 10000, popular: false },
    { credits: 20, price: 19000, popular: false },
    { credits: 50, price: 47000, popular: true },
    { credits: 100, price: 95000, popular: false },
    { credits: 500, price: 450000, popular: false },
];

export default function TopUpModal({ onClose, onSuccess }: TopUpModalProps) {
    const { getIdToken } = useAuth();
    const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<{ added: number; newBalance: number } | null>(null);

    const handlePayment = async () => {
        if (selectedPackage === null) return;
        
        const pkg = PACKAGES[selectedPackage];
        setIsProcessing(true);
        setError(null);

        try {
            const token = await getIdToken();
            
            // Artificial delay to mock a payment gateway
            await new Promise((resolve) => setTimeout(resolve, 1500));
            
            const result = await apiClient.post('/users/me/top-up', { credits: pkg.credits }, token);
            
            setSuccessData({
                added: pkg.credits,
                newBalance: result.walletBalance,
            });
            onSuccess(result.walletBalance);
        } catch (err: any) {
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !isProcessing && onClose()}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {successData ? (
                    <div className="p-8 relative">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-10" />
                        <div className="flex justify-center mb-6 pt-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute h-24 w-24 bg-indigo-400 rounded-full animate-ping opacity-20" />
                                <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                                    <CheckCircle className="h-10 w-10 text-indigo-600" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 text-center tracking-tight">Payment Successful!</h2>
                        <p className="text-indigo-600 font-medium text-sm text-center mt-1">Credits added to your wallet</p>

                        <div className="mt-8 bg-white rounded-2xl p-5 space-y-4 border border-gray-100 shadow-sm relative overflow-hidden text-center">
                            <p className="text-sm font-medium text-gray-500 mb-1">You just bought</p>
                            <div className="flex items-center justify-center gap-2 text-3xl font-black text-gray-900">
                                {successData.added} <Brain className="h-8 w-8 text-indigo-600" />
                            </div>
                            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">New Wallet Balance</span>
                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                    {successData.newBalance} <Brain className="h-4 w-4" />
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-8 w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    Buy Credits <Brain className="h-5 w-5 text-indigo-600" />
                                </h3>
                                <p className="text-sm font-medium text-gray-500 mt-1">
                                    Add funds to your wallet to book coaching sessions.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200 disabled:opacity-50 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {PACKAGES.map((pkg, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedPackage(idx)}
                                        className={`w-full relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                            selectedPackage === idx
                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                : 'border-gray-100 hover:border-indigo-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pkg.popular && (
                                            <span className="absolute -top-3 left-4 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                                Most Popular
                                            </span>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                                selectedPackage === idx ? 'border-indigo-600' : 'border-gray-300'
                                            }`}>
                                                {selectedPackage === idx && <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-lg font-black text-gray-900">
                                                {pkg.credits} <Brain className={`h-5 w-5 ${selectedPackage === idx ? 'text-indigo-600' : 'text-gray-400'}`} />
                                            </div>
                                        </div>
                                        <div className="font-semibold text-gray-700">
                                            {pkg.price.toLocaleString('vi-VN')} ₫
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessing || selectedPackage === null}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-[15px] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-[0.98]"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            Processing Gateway...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-5 w-5 mr-2" />
                                            Simulate Payment
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs font-medium text-gray-400 mt-4 flex items-center justify-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Secure Mock Payment
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
