import { useState, useEffect } from 'react';
import { X, Brain, CheckCircle, Loader2, AlertCircle, Receipt, Clock, Bell } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import type { MarketplaceListing } from '@/pages/marketplace/TeacherList';

interface BookingCheckoutModalProps {
    listing: MarketplaceListing;
    onClose: (didComplete: boolean) => void;
    scheduledAt?: string | null;
}

interface Reservation {
    id: number;
    expiresAt: string;
    version: number;
}

export default function BookingCheckoutModal({ listing, onClose, scheduledAt }: BookingCheckoutModalProps) {
    const { getIdToken } = useAuth();
    
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    
    const [isAcquiringLock, setIsAcquiringLock] = useState(true);
    const [isProcessingPay, setIsProcessingPay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<any | null>(null);

    // 1. Acquire Lease & Fetch Wallet on Mount
    useEffect(() => {
        let isMounted = true;
        
        const initCheckout = async () => {
            try {
                setIsAcquiringLock(true);
                setError(null);
                const token = await getIdToken();
                
                // Fetch wallet balance
                const userProfile = await apiClient.get('/users/me', token);
                if (isMounted) setWalletBalance(Number(userProfile.wallet_balance || 0));

                // Acquire 5-minute lease
                const resData = await apiClient.post(`/reservations/${listing.id}`, {}, token);
                
                if (isMounted) {
                    setReservation(resData.reservation);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Failed to secure the slot. Someone else might be booking it.');
                }
            } finally {
                if (isMounted) setIsAcquiringLock(false);
            }
        };
        
        initCheckout();
        
        return () => { isMounted = false; };
    }, [listing.id, getIdToken]);

    // 2. Countdown Timer
    useEffect(() => {
        if (!reservation || successData) return;
        
        const updateTimer = () => {
            const expires = new Date(reservation.expiresAt).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.floor((expires - now) / 1000));
            setTimeLeft(diff);
            
            if (diff === 0) {
                setError('Your reservation lease has expired. The slot is now available to others.');
            }
        };
        
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [reservation, successData]);

    const handlePayment = async () => {
        if (!reservation) return;
        
        setIsProcessingPay(true);
        setError(null);

        try {
            const token = await getIdToken();
            const result = await apiClient.post(
                `/reservations/${reservation.id}/pay`,
                { version: reservation.version, scheduledAt: scheduledAt ?? null },
                token
            );
            
            setSuccessData(result);
        } catch (err: any) {
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessingPay(false);
        }
    };

    // Format MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const hasSufficientBalance = walletBalance !== null && walletBalance >= listing.pricePerHour;
    const isExpired = timeLeft === 0;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !isProcessingPay && onClose(!!successData)}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── ACQUIRING LOCK STATE ────────────────────────────── */}
                {isAcquiringLock ? (
                    <div className="p-12 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <h3 className="text-lg font-bold text-gray-800">Securing your slot...</h3>
                        <p className="text-sm text-gray-500 text-center">
                            Checking availability and placing a 5-minute hold on this coaching session.
                        </p>
                    </div>
                ) : successData ? (
                /* ── SUCCESS RECEIPT STATE ────────────────────────────── */
                    <div className="p-8 relative">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-white -z-10" />
                        <div className="flex justify-center mb-6 pt-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute h-24 w-24 bg-emerald-400 rounded-full animate-ping opacity-20" />
                                <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 text-center tracking-tight">Booking Confirmed!</h2>
                        <p className="text-emerald-600 font-medium text-sm text-center mt-1">Payment Successful</p>

                        <div className="mt-8 bg-white rounded-2xl p-5 space-y-4 border border-gray-100 shadow-sm relative overflow-hidden">
                            {/* Receipt decorative edge */}
                            <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-emerald-50" />
                            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-emerald-50" />
                            
                            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 border-dashed">
                                <Receipt className="h-4 w-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Receipt details</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Service</span>
                                <span className="font-bold text-gray-900 text-right">
                                    IELTS {listing.skills[0]} Coaching
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Amount Paid</span>
                                <span className="font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                                    {listing.pricePerHour} <Brain className="h-3 w-3" />
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Reference</span>
                                <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                    REQ-{String(successData.marketplaceRequestId).padStart(5, '0')}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-start gap-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                            <Bell className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                Your tutor has been notified! They will review the request and get in touch shortly.
                            </p>
                        </div>

                        <button
                            onClick={() => onClose(true)}
                            className="mt-8 w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
                        >
                            Back to Marketplace
                        </button>
                    </div>
                ) : (
                /* ── CHECKOUT FORM / ERROR STATE ────────────────────────────── */
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Checkout</h3>
                                <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                                    <span>IELTS {listing.skills[0]} with {listing.teacher?.name.split(' ')[0]}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => onClose(false)}
                                disabled={isProcessingPay}
                                className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200 disabled:opacity-50 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 flex-1">
                            {/* Error Banner */}
                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                                    <div className="font-medium leading-relaxed">{error}</div>
                                </div>
                            )}

                            {/* Timer Banner (only if we have a reservation lock and it's not expired) */}
                            {reservation && !isExpired && !error && (
                                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex items-center justify-center h-4 w-4">
                                            <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-30" />
                                            <Clock className="h-4 w-4 text-amber-600 relative z-10" />
                                        </div>
                                        <span className="text-sm font-bold text-amber-900">Slot Reserved</span>
                                    </div>
                                    <span className="font-mono font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded-md text-sm">
                                        {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                                    </span>
                                </div>
                            )}

                            {/* Price Breakdown */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-500 font-medium">Session Cost</span>
                                    <div className="flex items-center gap-1.5 text-xl font-black text-gray-900">
                                        {listing.pricePerHour} <Brain className="h-5 w-5 text-indigo-600" />
                                    </div>
                                </div>

                                {/* Wallet Status */}
                                <div className={`pt-4 border-t border-gray-100 flex justify-between items-center ${hasSufficientBalance ? '' : 'text-red-600'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700">Your Wallet Balance</span>
                                        {!hasSufficientBalance && walletBalance !== null && (
                                            <span className="text-xs font-medium text-red-500 mt-0.5">Insufficient funds</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-bold">
                                        {walletBalance !== null ? (
                                            <>
                                                {walletBalance} <Brain className={`h-4 w-4 ${hasSufficientBalance ? 'text-indigo-600' : 'text-red-500'}`} />
                                            </>
                                        ) : (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2">
                                {reservation && !isExpired ? (
                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessingPay || !hasSufficientBalance || walletBalance === null}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-[15px] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-[0.98]"
                                    >
                                        {isProcessingPay ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                Processing Payment...
                                            </>
                                        ) : !hasSufficientBalance ? (
                                            'Not Enough Credits'
                                        ) : (
                                            `Pay ${listing.pricePerHour} Credits to Confirm`
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onClose(false)}
                                        className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-[15px] hover:bg-gray-200 transition-colors active:scale-[0.98]"
                                    >
                                        Close
                                    </button>
                                )}
                                
                                {reservation && !isExpired && (
                                    <p className="text-center text-xs font-medium text-gray-400 mt-4 flex items-center justify-center gap-1">
                                        <Lock className="h-3 w-3" /> Secure Wallet Transaction
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Ensure Lock icon is imported if not already
import { Lock } from 'lucide-react';
