import { useState, useEffect } from 'react';
import { Star, Clock, BadgeCheck, BookOpen, Brain, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { MarketplaceListing } from '@/pages/marketplace/TeacherList';

interface TeacherCardProps {
    listing: MarketplaceListing;
    /** Called after a successful reservation so the parent can refresh the list */
    onReserved?: (listingId: number) => void;
}

// ─── Reservation Status Badge ─────────────────────────────────────────────────

interface StatusBadgeProps {
    status: 'available' | 'pending' | 'booked';
    isOwn: boolean;
    expiresAt: string | null;
}

function ReservationBadge({ status, isOwn, expiresAt }: StatusBadgeProps) {
    // Live countdown for pending slots
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (status !== 'pending' || !expiresAt) {
            setSecondsLeft(null);
            return;
        }
        const updateTimer = () => {
            const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(diff);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [status, expiresAt]);

    if (status === 'booked') {
        return (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                <CheckCircle2 className="h-3 w-3" />
                Booked
            </span>
        );
    }

    if (status === 'pending') {
        const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
        const secs = secondsLeft !== null ? secondsLeft % 60 : null;
        const label = isOwn
            ? `Your hold${mins !== null ? ` — ${mins}:${String(secs).padStart(2, '0')}` : ''}`
            : `In checkout${mins !== null ? ` (${mins}:${String(secs).padStart(2, '0')})` : ''}`;

        return (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isOwn
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-orange-100 text-orange-600'
                }`}>
                <Lock className="h-3 w-3" />
                {label}
            </span>
        );
    }

    // available
    return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Available
        </span>
    );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export default function TeacherCard({ listing, onReserved }: TeacherCardProps) {
    console.log('[TeacherCard] render called', { listingId: listing.id, reservationStatus: listing.reservationStatus });

    const [showConflictAlert, setShowConflictAlert] = useState(false);

    const teacherName = listing.teacher?.name || 'Unknown Teacher';
    const avatar = listing.teacher?.avatar || `https://ui-avatars.com/api/?name=T&background=random`;

    // Derived booleans for clarity
    const isAvailable = listing.reservationStatus === 'available';
    const isPendingByOther = listing.reservationStatus === 'pending' && !listing.isOwnReservation;
    const isBooked = false;
    const canBook = isAvailable; // only allow new bookings when slot is free

    const handleBookClick = () => {
        console.log('[TeacherCard] handleBookClick called', { listingId: listing.id, canBook });
        if (isPendingByOther || isBooked) {
            // Show inline alert rather than letting the user proceed
            setShowConflictAlert(true);
            setTimeout(() => setShowConflictAlert(false), 4000);
            return;
        }
        // Trigger parent to open BookingCheckoutModal (Task 4)
        onReserved?.(listing.id);
    };

    return (
        <div className={`bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden flex flex-col ${isBooked
                ? 'border-gray-200 opacity-60'
                : isPendingByOther
                    ? 'border-orange-200'
                    : 'border-gray-200 hover:shadow-md hover:-translate-y-0.5'
            }`}>

            {/* Conflict alert banner */}
            {showConflictAlert && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200 text-orange-700 text-xs font-medium animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {isBooked
                        ? 'This coaching session has already been booked.'
                        : 'This slot is currently being held by another student. Try again in a few minutes.'}
                </div>
            )}

            <div className="p-6 flex-1">
                {/* Teacher profile header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center">
                        <img
                            src={avatar}
                            alt={teacherName}
                            className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div className="ml-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center">
                                {teacherName}
                                <BadgeCheck className="h-4 w-4 text-blue-500 ml-1" />
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {listing.sessionDuration} min session
                            </p>
                        </div>
                    </div>

                    {/* Price with 🧠 Brain Credits */}
                    <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600 flex items-center gap-1 justify-end">
                            <Brain className="h-4 w-4 text-indigo-400" />
                            {listing.pricePerHour.toLocaleString('vi-VN')}
                        </p>
                        <p className="text-xs text-gray-400">credits/hr</p>
                    </div>
                </div>

                {/* Listing title */}
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                        {listing.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
                </div>

                {/* Star rating placeholder */}
                <div className="mt-3">
                    <div className="flex items-center space-x-1 text-sm text-amber-500 font-medium">
                        <Star className="h-4 w-4 fill-current" />
                        <span>New</span>
                    </div>
                </div>

                {/* Skill tags */}
                <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5">
                        {listing.skills.map((skill) => (
                            <span
                                key={skill}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md font-medium"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer: status badge + action */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                <ReservationBadge
                    status={listing.reservationStatus}
                    isOwn={listing.isOwnReservation}
                    expiresAt={listing.reservationExpiresAt}
                />

                <button
                    id={`book-listing-${listing.id}`}
                    onClick={handleBookClick}
                    disabled={isBooked}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isBooked
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isPendingByOther
                                ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                        }`}
                >
                    {isBooked ? 'Sold Out' : isPendingByOther ? 'Notify Me' : listing.isOwnReservation ? 'Continue Booking' : 'Book Now'}
                </button>
            </div>
        </div>
    );
}
