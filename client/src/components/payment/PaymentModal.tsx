import { useState } from 'react';
import { X, CreditCard, CheckCircle, Loader2, AlertCircle, Receipt, Bell } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    description: string;
    /** The listing being booked */
    listingId: number;
    /** The teacher who owns the listing */
    teacherId: string;
}

interface BookingResult {
    id: number;
    serviceLabel: string;
    amountFormatted: string;
    fee: number;
}

export default function PaymentModal({
    isOpen,
    onClose,
    amount,
    description,
    listingId,
    teacherId,
}: PaymentModalProps) {
    console.log('[PaymentModal] render called', { isOpen, listingId, teacherId });

    const { getIdToken } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [booking, setBooking] = useState<BookingResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePayment = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const token = await getIdToken();

            const result = await apiClient.post(
                '/marketplace/requests',
                {
                    listingId,
                    teacherId,
                    message: `Booking request for: ${description}`,
                },
                token
            );

            console.log('[PaymentModal] handlePayment success', { requestId: result.id });
            setBooking({
                id: result.id,
                serviceLabel: result.serviceLabel ?? description,
                amountFormatted: result.amountFormatted ?? amount.toLocaleString('vi-VN'),
                fee: result.fee ?? amount,
            });
        } catch (err: unknown) {
            // Attempt to extract the server's error field for user-friendly messaging
            // (e.g. the duplicate guard returns { error: 'You already have a pending request...' })
            let message = 'Payment failed. Please try again.';
            if (err instanceof Error) {
                message = err.message;
            }
            console.error('[PaymentModal] handlePayment error', err);
            setError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        console.log('[PaymentModal] handleClose called');
        setBooking(null);
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">

                {/* ── SUCCESS / RECEIPT STATE ────────────────────────────── */}
                {booking ? (
                    <div className="p-8">
                        {/* Animated check */}
                        <div className="flex justify-center mb-5">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute h-24 w-24 bg-emerald-50 rounded-full animate-ping opacity-20" />
                                <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 text-center">Transaction Complete</h2>
                        <p className="text-gray-400 text-sm text-center mt-1">Your booking has been confirmed</p>

                        {/* Receipt card */}
                        <div className="mt-6 bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Receipt className="h-4 w-4 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Service</span>
                                <span className="font-semibold text-gray-800 text-right max-w-[60%]">{booking.serviceLabel}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Amount Paid</span>
                                <span className="font-bold text-indigo-700">{booking.amountFormatted} VND</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Reference</span>
                                <span className="font-mono text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                    #{String(booking.id).padStart(6, '0')}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Status</span>
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                                    Awaiting tutor confirm
                                </span>
                            </div>
                        </div>

                        {/* Both notified message */}
                        <div className="mt-4 flex items-start gap-2 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                            <Bell className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                You and your tutor have both been notified. Check <span className="font-semibold">Payments</span> in your sidebar to track the status.
                            </p>
                        </div>

                        <button
                            id="payment-done-btn"
                            onClick={handleClose}
                            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>

                ) : (
                    /* ── CHECKOUT STATE ───────────────────────────────────── */
                    <>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Checkout</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Error banner */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-between items-center py-4 border-b border-gray-100 border-dashed">
                                <span className="text-gray-600 font-medium">Total Amount</span>
                                <span className="text-3xl font-bold text-indigo-600">{amount.toLocaleString('vi-VN')} VND</span>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-gray-700">Select Payment Method</p>
                                <div className="p-4 border-2 border-indigo-600 bg-indigo-50 rounded-xl flex items-center cursor-pointer relative">
                                    <CreditCard className="h-6 w-6 text-indigo-600 mr-4" />
                                    <div>
                                        <p className="font-bold text-indigo-900">Visa ending in 4242</p>
                                        <p className="text-xs text-indigo-700">Expires 12/28</p>
                                    </div>
                                    <div className="absolute right-4 h-4 w-4 bg-indigo-600 rounded-full border-2 border-white ring-2 ring-indigo-200" />
                                </div>
                                <div className="p-4 border border-gray-200 rounded-xl flex items-center opacity-50 cursor-not-allowed">
                                    <div className="h-6 w-6 rounded bg-gray-200 mr-4" />
                                    <div>
                                        <p className="font-medium text-gray-500">QR Payment (Unavailable)</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                id="confirm-payment-btn"
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-200"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    `Pay ${amount.toLocaleString('vi-VN')} VND`
                                )}
                            </button>
                            <p className="text-center text-xs text-gray-400 flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 mr-1" /> Secure 256-bit SSL Encrypted
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
