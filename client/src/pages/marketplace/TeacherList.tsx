import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import TeacherCard from '@/components/marketplace/TeacherCard';
import BookingCheckoutModal from '@/components/payment/BookingCheckoutModal';
import CalendarMatrix, { TeacherAvailability } from '@/components/calendar/CalendarMatrix';
import { Search, SlidersHorizontal, AlertCircle, X, CalendarDays, Brain } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

/** Shape returned by GET /api/marketplace/listings */
export interface MarketplaceListing {
    id: number;
    teacherId: string;
    title: string;
    description: string;
    skills: string[];
    pricePerHour: number;
    sessionDuration: number;
    isActive: boolean;
    createdAt: string;
    teacher: {
        id: string;
        name: string;
        email: string;
        avatar: string;
    } | null;
    // ── Reservation status enriched by backend ──────────────────────────────
    reservationStatus: 'available' | 'pending' | 'booked';
    isOwnReservation: boolean;
    reservationExpiresAt: string | null;
}

export default function TeacherList() {
    console.log('[TeacherList] render called');

    const { getIdToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Tutors');
    // ── Checkout flow state ─────────────────────────────────────────────────
    const [checkoutListingId, setCheckoutListingId] = useState<number | null>(null);
    const checkoutListing = listings.find((l) => l.id === checkoutListingId) ?? null;

    // ── Calendar / slot selection step ──────────────────────────────────────
    const [calendarListingId, setCalendarListingId] = useState<number | null>(null);
    const calendarListing = listings.find((l) => l.id === calendarListingId) ?? null;
    const [selectedSlot, setSelectedSlot] = useState<TeacherAvailability | null>(null);

    const SKILL_FILTERS = ['All Tutors', 'Speaking', 'Writing', 'Reading', 'Listening'];

    // Fetch listings from the real API
    useEffect(() => {
        const fetchListings = async () => {
            console.log('[TeacherList] fetchListings called');
            setLoading(true);
            setError(null);
            try {
                const token = await getIdToken();

                // Build query params
                const params = new URLSearchParams();
                if (searchTerm.trim()) {
                    params.set('search', searchTerm.trim());
                }
                if (activeFilter !== 'All Tutors') {
                    params.set('skill', activeFilter);
                }

                const query = params.toString() ? `?${params.toString()}` : '';
                const data = await apiClient.get(`/marketplace/listings${query}`, token);
                console.log('[TeacherList] fetchListings success', { count: data.length });
                setListings(data);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load listings';
                console.error('[TeacherList] fetchListings error', err);
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [activeFilter]); // Re-fetch when filter changes

    // Called by TeacherCard when a student clicks "Book Now"
    // Now opens the calendar step first
    const handleReserve = (listingId: number) => {
        console.log('[TeacherList] handleReserve called', { listingId });
        setCalendarListingId(listingId);
        setSelectedSlot(null);
    };

    const handleCheckoutClose = (didComplete: boolean) => {
        console.log('[TeacherList] handleCheckoutClose called', { didComplete });
        setCheckoutListingId(null);
        setCalendarListingId(null);
        setSelectedSlot(null);
        if (didComplete) {
            setActiveFilter((prev) => prev);
        }
    };

    const handleSlotConfirm = () => {
        console.log('[TeacherList] handleSlotConfirm called', { selectedSlot });
        if (!calendarListingId) return;
        setCheckoutListingId(calendarListingId);
        setCalendarListingId(null);
    };

    // Client-side search on top of loaded listings (for instant feedback)
    const filteredListings = searchTerm.trim()
        ? listings.filter(
              (l) =>
                  l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  l.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  l.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : listings;

    return (
        <DashboardLayout role="student">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Find a Tutor</h1>
                        <p className="text-gray-500 mt-1">Connect with expert IELTS instructors for personalized guidance.</p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or skill..."
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 md:w-80"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                            <SlidersHorizontal className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => navigate('/marketplace')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            location.pathname === '/marketplace'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        All Tutors
                    </button>
                    <button
                        onClick={() => navigate('/my-requests')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            location.pathname === '/my-requests'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        My Requests
                    </button>
                </div>

                {/* Skill Filters */}
                <div className="flex flex-wrap gap-2 pb-2">
                    {SKILL_FILTERS.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                activeFilter === filter
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Content States */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-16 w-16 rounded-full bg-gray-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-100 rounded" />
                                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <div className="h-6 bg-gray-100 rounded-md w-16" />
                                    <div className="h-6 bg-gray-100 rounded-md w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Failed to load tutors</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">{error}</p>
                        <button
                            onClick={() => setActiveFilter(activeFilter)}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700">No tutors found</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {searchTerm
                                ? `No results for "${searchTerm}". Try a different search term.`
                                : 'No active listings available at the moment. Check back later!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredListings.map((listing) => (
                            <TeacherCard
                                key={listing.id}
                                listing={listing}
                                onReserved={handleReserve}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── CalendarMatrix step ── shown before checkout ─────────── */}
            {calendarListing && !checkoutListingId && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => { setCalendarListingId(null); setSelectedSlot(null); }}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">Pick a Time Slot</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{calendarListing.teacher?.name ?? 'Tutor'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setCalendarListingId(null); setSelectedSlot(null); }}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Calendar */}
                        <div className="p-5">
                            <CalendarMatrix
                                teacherId={calendarListing.teacherId}
                                onSlotSelected={setSelectedSlot}
                                selectedSlot={selectedSlot}
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                            <div className="text-sm text-gray-600">
                                {selectedSlot ? (
                                    <span className="font-semibold text-indigo-700">
                                        {new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">No slot selected yet</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                    {calendarListing.pricePerHour} <Brain className="h-4 w-4 text-indigo-600" />
                                </span>
                                <button
                                    id="confirm-slot"
                                    disabled={!selectedSlot}
                                    onClick={handleSlotConfirm}
                                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
                                >
                                    Confirm & Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BookingCheckoutModal ──────────────────────────────────── */}
            {checkoutListing && selectedSlot && (
                <BookingCheckoutModal
                    listing={checkoutListing}
                    onClose={handleCheckoutClose}
                    availabilityId={selectedSlot.id}
                    scheduledAt={`${selectedSlot.date}T${selectedSlot.startTime}:00`}
                />
            )}
        </DashboardLayout>
    );
}
