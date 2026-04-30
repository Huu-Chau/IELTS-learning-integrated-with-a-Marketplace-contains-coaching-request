import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, Clock } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

export interface TeacherAvailability {
    id: number;
    teacherId: string;
    date: string;       // YYYY-MM-DD
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
    timezone?: string;
    isAvailable: boolean;
}

interface CalendarMatrixProps {
    teacherId: string;
    /** Called when the student selects a slot */
    onSlotSelected: (slot: TeacherAvailability) => void;
    /** The currently selected slot (if any) */
    selectedSlot?: TeacherAvailability | null;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHour(timeString: string): string {
    const [hStr, mStr] = timeString.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

export default function CalendarMatrix({ teacherId, onSlotSelected, selectedSlot }: CalendarMatrixProps) {
    const { getIdToken } = useAuth();
    const [slots, setSlots] = useState<TeacherAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

    useEffect(() => {
        async function fetchSlots() {
            console.log('[CalendarMatrix] fetchSlots called', { teacherId });
            setLoading(true);
            setError(null);
            try {
                const token = await getIdToken();
                const data = await apiClient.get(
                    `/marketplace/teachers/${teacherId}/availability`,
                    token
                );
                const availabilities = Array.isArray(data) ? data : (data.slots ?? []);
                setSlots(availabilities);
                console.log('[CalendarMatrix] fetchSlots success', { count: availabilities.length });
            } catch (err: any) {
                console.error('[CalendarMatrix] fetchSlots error', err);
                setError('Could not load availability. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        fetchSlots();
    }, [teacherId, getIdToken]);

    // Build the 7-day week window based on weekOffset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + weekOffset * 7);

    const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    // Group slots by date string for fast lookup
    const slotsByDate: Record<string, TeacherAvailability[]> = {};
    for (const slot of slots) {
        const [y, m, d] = slot.date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const key = dateObj.toDateString();
        if (!slotsByDate[key]) slotsByDate[key] = [];
        slotsByDate[key].push(slot);
    }

    // Slots for the selected day
    const daySlots = selectedDate ? (slotsByDate[selectedDate.toDateString()] ?? []) : [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Loading availability...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10 text-red-500 text-sm font-medium">
                {error}
            </div>
        );
    }

    if (slots.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No availability set</p>
                <p className="text-sm text-gray-400 mt-1">This teacher hasn't set their schedule yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Week navigation header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => { setWeekOffset((w) => w - 1); setSelectedDate(null); }}
                    disabled={weekOffset === 0}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                <span className="text-sm font-semibold text-gray-700">
                    {weekDays[0].getDate()} {MONTH_NAMES[weekDays[0].getMonth()]} –{' '}
                    {weekDays[6].getDate()} {MONTH_NAMES[weekDays[6].getMonth()]} {weekDays[0].getFullYear()}
                </span>

                <button
                    onClick={() => { setWeekOffset((w) => w + 1); setSelectedDate(null); }}
                    disabled={weekOffset >= 1} // Only show 14 days (2 weeks)
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            {/* Day selector strip */}
            <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                    const daySlotList = slotsByDate[day.toDateString()] ?? [];
                    const availableCount = daySlotList.filter((s) => s.isAvailable).length;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isPast = day < today;

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => !isPast && setSelectedDate(day)}
                            disabled={isPast || availableCount === 0}
                            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all text-center ${
                                isSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                    : isPast || availableCount === 0
                                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700'
                            }`}
                        >
                            <span className="text-[11px] font-medium uppercase tracking-wide">
                                {DAY_SHORT[day.getDay()]}
                            </span>
                            <span className="text-lg font-bold mt-0.5">{day.getDate()}</span>
                            {!isPast && availableCount > 0 && (
                                <span className={`text-[10px] font-semibold mt-1 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                    {availableCount} slot{availableCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Time slot list */}
            {selectedDate && (
                <div className="pt-2">
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Available slots for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {daySlots.map((slot, idx) => {
                            const isChosen = selectedSlot?.id === slot.id;
                            return (
                                <button
                                    key={idx}
                                    disabled={!slot.isAvailable}
                                    onClick={() => slot.isAvailable && onSlotSelected(slot)}
                                    className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center justify-center gap-1 ${
                                        !slot.isAvailable
                                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                                            : isChosen
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-800'
                                    }`}
                                >
                                    <span>{formatHour(slot.startTime)} - {formatHour(slot.endTime)}</span>
                                    {!slot.isAvailable && (
                                        <span className="block text-[10px] font-medium text-gray-400 no-underline">Booked</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {!selectedDate && (
                <p className="text-center text-sm text-gray-400 py-4">
                    Select a date above to see available time slots.
                </p>
            )}
        </div>
    );
}
