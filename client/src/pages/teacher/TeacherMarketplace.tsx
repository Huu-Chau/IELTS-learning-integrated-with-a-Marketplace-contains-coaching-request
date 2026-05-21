import { useState, useEffect } from 'react';
import TeacherLayout from '@/layouts/TeacherLayout';
import {
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Clock,
    Tag,
    X,
    Brain,
    Loader2,
    Search,
    Filter,
    BookOpen,
    Headphones,
    Pen,
    Mic,
    CheckCircle,
    CalendarDays,
    Save,
} from 'lucide-react';
import { useTeacherApi, useTeacherMutation } from '@/hooks/useTeacherApi';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Listing {
    id: number;
    title: string;
    description: string;
    skills: string[];
    pricePerHour: number;
    sessionDuration: number;
    isActive: boolean;
    createdAt: string;
}

interface Order {
    id: number;
    studentId: string;
    studentName: string;
    status: 'pending' | 'accepted' | 'completed' | 'rejected';
    fee: number;
    skill: string | null;
    message: string | null;
    scheduledAt: string | null;
    createdAt: string;
}

interface AvailabilityRule {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_HOURS = { startTime: '09:00', endTime: '17:00' };

// ── Skill config ──────────────────────────────────────────────────────────────

const SKILL_OPTIONS = [
    { label: 'Reading', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
    { label: 'Listening', icon: Headphones, color: 'bg-purple-100 text-purple-700' },
    { label: 'Writing', icon: Pen, color: 'bg-amber-100 text-amber-700' },
    { label: 'Speaking', icon: Mic, color: 'bg-rose-100 text-rose-700' },
];

function SkillBadge({ skill }: { skill: string }) {
    const cfg = SKILL_OPTIONS.find((s) => s.label === skill);
    const Icon = cfg?.icon ?? Tag;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
            <Icon className="h-3 w-3" />
            {skill}
        </span>
    );
}

// ── Create Listing Modal ──────────────────────────────────────────────────────

interface CreateModalProps {
    onClose: () => void;
    onCreated: () => void;
}

function CreateListingModal({ onClose, onCreated }: CreateModalProps) {
    const { post, loading } = useTeacherMutation();
    const [form, setForm] = useState({
        title: '',
        description: '',
        skills: [] as string[],
        pricePerHour: '',
        sessionDuration: '60',
    });
    const [error, setError] = useState<string | null>(null);

    const toggleSkill = (skill: string) => {
        setForm((prev) => ({
            ...prev,
            skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[CreateListingModal] handleSubmit called', form);
        if (!form.title || !form.description || form.skills.length === 0 || !form.pricePerHour) {
            setError('Please fill in all required fields and select at least one skill.');
            return;
        }
        try {
            await post('/teacher/listings', {
                ...form,
                pricePerHour: parseFloat(form.pricePerHour),
                sessionDuration: parseInt(form.sessionDuration),
            });
            console.log('[CreateListingModal] handleSubmit success');
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create listing');
            console.error('[CreateListingModal] handleSubmit error', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Create New Listing</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                        <input
                            id="listing-title"
                            type="text"
                            placeholder="e.g. Speaking Band 7+ Coaching"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                        <textarea
                            id="listing-description"
                            placeholder="Describe what students will get from this session..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Skills *</label>
                        <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.map(({ label }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleSkill(label)}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                                        form.skills.includes(label)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'text-gray-600 border-gray-300 hover:border-indigo-400'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">Price / hr <Brain className="h-3 w-3 text-indigo-500" /> *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-[55%] text-gray-400 font-medium"><Brain className="h-4 w-4 text-gray-400" /></span>
                                <input
                                    id="listing-price"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    placeholder="25.00"
                                    value={form.pricePerHour}
                                    onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                            <select
                                id="listing-duration"
                                value={form.sessionDuration}
                                onChange={(e) => setForm({ ...form, sessionDuration: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors bg-white"
                            >
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            id="create-listing-submit"
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create Listing
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};

// ── Schedule Panel ────────────────────────────────────────────────────────────

interface TeacherAvailabilityRecord {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}

function SchedulePanel() {
    const { getIdToken, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    
    const [availabilities, setAvailabilities] = useState<TeacherAvailabilityRecord[]>([]);
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    useEffect(() => {
        async function fetchSchedule() {
            try {
                const token = await getIdToken();
                const data = await apiClient.get(`/teacher-availability?teacherId=${user?.uid}`, token);
                setAvailabilities(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('[SchedulePanel] fetchSchedule error', err);
            } finally {
                setLoading(false);
            }
        }
        if (user?.uid) fetchSchedule();
    }, [getIdToken, user?.uid]);

    const handleAdd = async () => {
        if (!date || !startTime || !endTime) return;
        setSaving(true);
        try {
            const token = await getIdToken();
            const payload = {
                teacherId: user?.uid,
                date,
                startTime,
                endTime,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            await apiClient.post('/teacher-availability', payload, token);
            // Refetch to ensure we get the ID correctly
            const data = await apiClient.get(`/teacher-availability?teacherId=${user?.uid}`, token);
            setAvailabilities(Array.isArray(data) ? data : []);
            setDate(''); // reset
        } catch (err) {
            console.error('[SchedulePanel] handleAdd error', err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (avail: TeacherAvailabilityRecord) => {
        try {
            const token = await getIdToken();
            const payload = { ...avail, isAvailable: !avail.isAvailable };
            await apiClient.put(`/teacher-availability/${avail.id}`, payload, token);
            setAvailabilities(availabilities.map(a => a.id === avail.id ? payload : a));
        } catch (err) {
            console.error('[SchedulePanel] handleToggle error', err);
        }
    };

    const handleDelete = async (avail: TeacherAvailabilityRecord) => {
        if (!avail.isAvailable) return;
        if (!window.confirm('Delete this availability slot?')) return;
        setDeleteError(null);
        try {
            const token = await getIdToken();
            await apiClient.del(`/teacher-availability/${avail.id}`, token);
            setAvailabilities(availabilities.filter(a => a.id !== avail.id));
        } catch (err: any) {
            console.error('[SchedulePanel] handleDelete error', err);
            // Refresh the list so the UI reflects the real DB state
            const token = await getIdToken();
            const data = await apiClient.get(`/teacher-availability?teacherId=${user?.uid}`, token);
            setAvailabilities(Array.isArray(data) ? data : []);

            if (err.response?.status === 409) {
                setDeleteError('This slot was just booked by a student and can no longer be deleted.');
            } else {
                setDeleteError('Failed to delete this slot. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Inline delete error banner */}
            {deleteError && (
                <div className="mx-6 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <span className="flex-1">{deleteError}</span>
                    <button onClick={() => setDeleteError(null)} className="text-amber-500 hover:text-amber-700 font-bold text-base leading-none">×</button>
                </div>
            )}
            {/* Panel header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <CalendarDays className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Manage Availability</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Add specific dates and times when you are available to teach.</p>
                    </div>
                </div>
            </div>

            {/* Add new availability form */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-end gap-4 flex-wrap">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Start Time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">End Time</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={saving || !date}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-sm shadow-indigo-200 h-[38px]"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add Slot
                </button>
            </div>

            {/* Existing slots */}
            <div className="divide-y divide-gray-50">
                {availabilities.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-400">No availability slots added yet.</div>
                ) : (
                    availabilities.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()).map((avail) => (
                        <div key={avail.id} className={`px-6 py-4 flex items-center justify-between transition-colors ${avail.isAvailable ? 'bg-white' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-5">
                                <button onClick={() => handleToggle(avail)} className="flex-shrink-0">
                                    {avail.isAvailable ? <ToggleRight className="h-8 w-8 text-indigo-600 transition-colors" /> : <ToggleLeft className="h-8 w-8 text-gray-300 transition-colors" />}
                                </button>
                                <div>
                                    <span className={`block font-semibold text-sm ${avail.isAvailable ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                        {new Date(avail.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-0.5 block flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {avail.startTime} - {avail.endTime}
                                    </span>
                                </div>
                            </div>
                            {!avail.isAvailable && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wider">Booked / Unavailable</span>}
                            {avail.isAvailable && (
                                <button
                                    onClick={() => handleDelete(avail)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete availability"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function TeacherMarketplace() {
    console.log('[TeacherMarketplace] render called');

    const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'schedule'>('listings');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [skillFilter, setSkillFilter] = useState<string>('All');

    const { data: listings, loading: listingsLoading, refetch: refetchListings } = useTeacherApi<Listing[]>('/teacher/listings');
    const { data: orders, loading: ordersLoading, refetch: refetchOrders } = useTeacherApi<Order[]>('/teacher/orders');
    const { patch, loading: patchLoading } = useTeacherMutation();
    const { del, loading: delLoading } = useTeacherMutation();

    const handleToggleActive = async (listing: Listing) => {
        console.log('[TeacherMarketplace] handleToggleActive called', { id: listing.id });
        try {
            await patch(`/teacher/listings/${listing.id}`, { isActive: !listing.isActive });
            refetchListings();
        } catch (err) {
            console.error('[TeacherMarketplace] handleToggleActive error', err);
        }
    };

    const handleDeleteListing = async (id: number) => {
        if (!window.confirm('Delete this listing? This cannot be undone.')) return;
        console.log('[TeacherMarketplace] handleDeleteListing called', { id });
        try {
            await del(`/teacher/listings/${id}`);
            refetchListings();
        } catch (err) {
            console.error('[TeacherMarketplace] handleDeleteListing error', err);
        }
    };

    const handleOrderAction = async (orderId: number, status: 'accepted' | 'rejected') => {
        console.log('[TeacherMarketplace] handleOrderAction called', { orderId, status });
        try {
            await patch(`/teacher/orders/${orderId}`, { status });
            // Bug #4 fix: refetch orders (not listings) so the Requests tab updates
            refetchOrders();
        } catch (err) {
            console.error('[TeacherMarketplace] handleOrderAction error', err);
        }
    };

    // Edit listing — inline controlled state
    const [editingListing, setEditingListing] = useState<Listing | null>(null);
    const [editForm, setEditForm] = useState<Partial<Listing>>({});
    const { patch: patchEdit, loading: editLoading } = useTeacherMutation();

    const handleOpenEdit = (listing: Listing) => {
        console.log('[TeacherMarketplace] handleOpenEdit called', { id: listing.id });
        setEditingListing(listing);
        setEditForm({ title: listing.title, description: listing.description, pricePerHour: listing.pricePerHour, sessionDuration: listing.sessionDuration });
    };

    const handleSaveEdit = async () => {
        if (!editingListing) return;
        console.log('[TeacherMarketplace] handleSaveEdit called', { id: editingListing.id, editForm });
        try {
            await patchEdit(`/teacher/listings/${editingListing.id}`, editForm);
            setEditingListing(null);
            refetchListings();
            console.log('[TeacherMarketplace] handleSaveEdit success');
        } catch (err) {
            console.error('[TeacherMarketplace] handleSaveEdit error', err);
        }
    };

    const filteredListings = listings?.filter((l) => {
        const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSkill = skillFilter === 'All' || l.skills.includes(skillFilter);
        return matchesSearch && matchesSkill;
    }) ?? [];

    const pendingOrders = orders?.filter((o) => o.status === 'pending') ?? [];

    return (
        <TeacherLayout>
            {showCreateModal && (
                <CreateListingModal onClose={() => setShowCreateModal(false)} onCreated={refetchListings} />
            )}

            {/* ── Edit Listing Modal ───────────────────────────────────── */}
            {editingListing && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditingListing(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Edit Listing</h2>
                            <button onClick={() => setEditingListing(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                                <input
                                    id="edit-listing-title"
                                    type="text"
                                    value={editForm.title ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    id="edit-listing-description"
                                    rows={3}
                                    value={editForm.description ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">Price / hr <Brain className="h-3 w-3 text-indigo-500" /></label>
                                    <input
                                        id="edit-listing-price"
                                        type="number" min="1" step="0.01"
                                        value={editForm.pricePerHour ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, pricePerHour: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                                    <select
                                        id="edit-listing-duration"
                                        value={editForm.sessionDuration ?? 60}
                                        onChange={(e) => setEditForm({ ...editForm, sessionDuration: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="30">30 min</option>
                                        <option value="45">45 min</option>
                                        <option value="60">60 min</option>
                                        <option value="90">90 min</option>
                                        <option value="120">120 min</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingListing(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="save-edit-listing"
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={editLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage your services and respond to student requests.</p>
                    </div>
                    <button
                        id="open-create-listing"
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New Listing
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {([['listings', 'My Listings'], ['requests', 'Student Requests'], ['schedule', 'My Schedule']] as const).map(([tab, label]) => (
                        <button
                            key={tab}
                            id={`tab-${tab}`}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {label}
                            {tab === 'requests' && pendingOrders.length > 0 && (
                                <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingOrders.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* My Listings tab */}
                {activeTab === 'listings' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="listing-search"
                                    type="text"
                                    placeholder="Search listings..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-52"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-gray-400" />
                                {['All', ...SKILL_OPTIONS.map((s) => s.label)].map((skill) => (
                                    <button
                                        key={skill}
                                        onClick={() => setSkillFilter(skill)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            skillFilter === skill
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'
                                        }`}
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {listingsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-44" />
                                ))}
                            </div>
                        ) : filteredListings.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                                <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="font-medium text-gray-500">No listings yet</p>
                                <p className="text-sm text-gray-400 mt-1">Create your first service offering to appear in the marketplace.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                    + Create Listing
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredListings.map((listing) => (
                                    <div
                                        key={listing.id}
                                        className={`bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${
                                            listing.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <h3 className="font-semibold text-gray-800 text-sm leading-snug">{listing.title}</h3>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    title={listing.isActive ? 'Deactivate' : 'Activate'}
                                                    onClick={() => handleToggleActive(listing)}
                                                    disabled={patchLoading}
                                                    className="text-gray-400 hover:text-indigo-500 transition-colors"
                                                >
                                                    {listing.isActive ? (
                                                        <ToggleRight className="h-6 w-6 text-indigo-500" />
                                                    ) : (
                                                        <ToggleLeft className="h-6 w-6" />
                                                    )}
                                                </button>
                                                <button
                                                    id={`edit-listing-${listing.id}`}
                                                    title="Edit listing"
                                                    onClick={() => handleOpenEdit(listing)}
                                                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    id={`delete-listing-${listing.id}`}
                                                    title="Delete listing"
                                                    onClick={() => handleDeleteListing(listing.id)}
                                                    disabled={delLoading}
                                                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{listing.description}</p>

                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {listing.skills.map((skill) => <SkillBadge key={skill} skill={skill} />)}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                                                <Brain className="h-3.5 w-3.5" />
                                                {listing.pricePerHour.toLocaleString('vi-VN')} /hr
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {listing.sessionDuration} min
                                            </span>
                                            <span
                                                className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    listing.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                }`}
                                            >
                                                {listing.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Student Requests tab */}
                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {ordersLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24" />
                                ))}
                            </div>
                        ) : !orders || orders.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                                <CheckCircle className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                                <p className="font-medium text-gray-500">No requests yet</p>
                                <p className="text-sm text-gray-400 mt-1">Student requests will appear here once you have active listings.</p>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                                                {order.studentName?.[0]?.toUpperCase() ?? 'S'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{order.studentName ?? `Order #${order.id}`}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}
                                                    {order.skill && (
                                                        <span className="ml-2 text-indigo-500 font-medium">· {order.skill}</span>
                                                    )}
                                                    {order.fee > 0 && (
                                                        <span className="ml-2 text-emerald-600 font-semibold flex items-center gap-1">
                                                            · {(order.fee).toLocaleString('vi-VN')} <Brain className="h-3 w-3" />
                                                        </span>
                                                    )}
                                                </p>
                                                {order.message && (
                                                    <p className="text-xs text-gray-500 mt-1 italic max-w-xs truncate">&ldquo;{order.message}&rdquo;</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                                                {order.status}
                                            </span>
                                            {order.status === 'pending' && (
                                                <>
                                                    <button
                                                        id={`accept-order-${order.id}`}
                                                        onClick={() => handleOrderAction(order.id, 'accepted')}
                                                        disabled={patchLoading}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        id={`decline-order-${order.id}`}
                                                        onClick={() => handleOrderAction(order.id, 'rejected')}
                                                        disabled={patchLoading}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* My Schedule tab */}
                {activeTab === 'schedule' && (
                    <SchedulePanel />
                )}
            </div>
        </TeacherLayout>
    );
}
