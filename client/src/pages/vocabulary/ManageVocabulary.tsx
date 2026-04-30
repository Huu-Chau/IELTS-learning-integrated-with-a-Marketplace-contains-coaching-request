import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Search, Mic, Trash2, Edit2, Eye, EyeOff, Loader2, Volume2
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

// API Configuration
const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

// Web Speech API interfaces
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Vocabulary {
    id: number;
    word: string;
    englishMeaning: string;
    vietnameseMeaning: string;
    ipaSpelling: string;
    masteryLevel: 'New' | 'Learning' | 'Mastered';
    createdAt: string;
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ManageVocabulary() {
    const { user } = useAuth();
    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
    const [formData, setFormData] = useState<Partial<Vocabulary>>({
        word: '', englishMeaning: '', vietnameseMeaning: '', ipaSpelling: ''
    });

    const [isFetchingIpa, setIsFetchingIpa] = useState(false);

    const handleWordBlur = async () => {
        if (!formData.word) return;
        setIsFetchingIpa(true);
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(formData.word)}`);
            if (res.ok) {
                const data = await res.json();
                let ipa = data[0]?.phonetic || '';
                if (!ipa && data[0]?.phonetics) {
                    const phoneticObj = data[0].phonetics.find((p: any) => p.text);
                    if (phoneticObj) {
                        ipa = phoneticObj.text;
                    }
                }
                if (ipa) {
                    ipa = ipa.replace(/\//g, '');
                    setFormData(prev => ({ ...prev, ipaSpelling: ipa }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch IPA:', error);
        } finally {
            setIsFetchingIpa(false);
        }
    };

    const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
    const [speakingWordId, setSpeakingWordId] = useState<number | null>(null);
    const [accuracyScores, setAccuracyScores] = useState<Record<number, number>>({});

    const recognitionRef = useRef<any>(null);

    // ── Fetch Vocabulary ─────────────────────────────────────────────────────
    const fetchVocabularies = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE}/api/vocabulary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setVocabularies(data.vocabularies);
        } catch (error) {
            console.error('Error fetching vocabulary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchVocabularies();
        }
    }, [user]);

    // ── Speech Recognition Setup ─────────────────────────────────────────────
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
        }
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await user?.getIdToken();
            const method = editingVocab ? 'PUT' : 'POST';
            const url = editingVocab
                ? `${API_BASE}/api/vocabulary/${editingVocab.id}`
                : `${API_BASE}/api/vocabulary`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Save failed');

            setIsModalOpen(false);
            setEditingVocab(null);
            setFormData({ word: '', englishMeaning: '', vietnameseMeaning: '', ipaSpelling: '' });
            fetchVocabularies();
        } catch (error) {
            console.error('Error saving vocabulary:', error);
            alert('Failed to save vocabulary. Please try again.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this word?')) return;
        try {
            const token = await user?.getIdToken();
            await fetch(`${API_BASE}/api/vocabulary/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchVocabularies();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const toggleReveal = (id: number) => {
        setRevealedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── Pronunciation Testing ────────────────────────────────────────────────
    const handleStartSpeaking = (vocab: Vocabulary) => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please try Chrome.');
            return;
        }

        setSpeakingWordId(vocab.id);

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            const targetWord = vocab.word.toLowerCase();

            // Calculate pseudo match percentage
            // Simple approach: exactly matching is 100%, otherwise 0 or partial based on words.
            // A real app would use Levenshtein distance, but we'll do basic word boundary matching for now.
            let acc = 0;
            if (transcript.includes(targetWord) || targetWord.includes(transcript)) {
                // Approximate partial match
                acc = transcript === targetWord ? 100 : 70;
            } else {
                acc = 10; // Recognized the wrong word entirely
            }

            setAccuracyScores(prev => ({ ...prev, [vocab.id]: acc }));
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setSpeakingWordId(null);
        };

        recognitionRef.current.onend = () => {
            setSpeakingWordId(null);
        };

        recognitionRef.current.start();
    };

    const handlePlayAudio = (word: string) => {
        if (!('speechSynthesis' in window)) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for language learning
        utterance.pitch = 1.0;
        
        // Ensure voices are loaded before picking one, though default en-US is usually fine
        const voices = window.speechSynthesis.getVoices();
        const enUSVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
        if (enUSVoice) {
            utterance.voice = enUSVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    const filteredVocabularies = vocabularies.filter(v =>
        v.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.englishMeaning?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vietnameseMeaning?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <DashboardLayout role="student">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Vocabulary Manager</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Store your words, conceal translations to memorize, and verify pronunciation.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingVocab(null);
                            setFormData({ word: '', englishMeaning: '', vietnameseMeaning: '', ipaSpelling: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-100"
                    >
                        <Plus className="w-5 h-5" /> Add New Word
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded-2xl shadow-sm">
                    <div className="flex-1 flex items-center gap-3 px-3 py-1.5 focus-within:ring-2 ring-indigo-100 rounded-xl transition-all">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search your vocabulary..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-700"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left align-middle border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                                    <th className="px-5 py-4 w-12 text-center">#</th>
                                    <th className="px-5 py-4 w-48">Word</th>
                                    <th className="px-5 py-4 min-w-[200px]">English Meaning</th>
                                    <th className="px-5 py-4 min-w-[200px]">Vietnamese</th>
                                    <th className="px-5 py-4">IPA</th>
                                    <th className="px-5 py-4 text-center">Pronunciation</th>
                                    <th className="px-5 py-4 w-16 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading vocabulary...
                                        </td>
                                    </tr>
                                ) : filteredVocabularies.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            No words found. Add one to get started!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVocabularies.map((vocab, idx) => {
                                        const isRevealed = revealedIds.has(vocab.id);
                                        const isSpeaking = speakingWordId === vocab.id;
                                        const accuracy = accuracyScores[vocab.id];

                                        return (
                                            <tr key={vocab.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-5 py-4 text-center text-gray-400 font-mono text-xs">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-5 py-4 font-bold text-gray-900">
                                                    {vocab.word}
                                                </td>
                                                <td className="px-5 py-4 text-gray-600 line-clamp-3">
                                                    {vocab.englishMeaning || '-'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-start gap-2 max-w-[250px]">
                                                        {isRevealed ? (
                                                            <span className="text-gray-700">{vocab.vietnameseMeaning || '-'}</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {/* Obfuscate with generic dots based on length */}
                                                                {Array.from({ length: Math.min(vocab.vietnameseMeaning?.length || 5, 12) }).map((_, i) => (
                                                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => toggleReveal(vocab.id)}
                                                            className="text-gray-300 hover:text-indigo-500 transition-colors shrink-0"
                                                        >
                                                            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono text-gray-500 min-w-[120px] text-xs">
                                                    {vocab.ipaSpelling ? `/${vocab.ipaSpelling}/` : '-'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handlePlayAudio(vocab.word)}
                                                                className="p-2 rounded-full text-blue-500 bg-blue-50 hover:bg-blue-100 hover:scale-110 transition-all"
                                                                title="Listen to Pronunciation"
                                                            >
                                                                <Volume2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartSpeaking(vocab)}
                                                                disabled={speakingWordId !== null && !isSpeaking}
                                                                className={`p-2 rounded-full transition-all ${isSpeaking
                                                                    ? 'bg-red-100 text-red-500 animate-pulse ring-4 ring-red-50'
                                                                    : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 group-hover:scale-110'
                                                                    }`}
                                                                title="Practice Speaking"
                                                            >
                                                                <Mic className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        {accuracy !== undefined && !isSpeaking && (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accuracy >= 80 ? 'bg-green-100 text-green-700' :
                                                                accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {accuracy}% Match
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingVocab(vocab);
                                                                setFormData(vocab);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(vocab.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingVocab ? 'Edit Vocabulary' : 'Add New Feature'}
                            </h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Word / Phrase *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.word || ''}
                                    onChange={e => setFormData({ ...formData, word: e.target.value })}
                                    onBlur={handleWordBlur}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-gray-900"
                                    placeholder="e.g. Ubiquitous"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Meaning</label>
                                <textarea
                                    value={formData.englishMeaning || ''}
                                    onChange={e => setFormData({ ...formData, englishMeaning: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all resize-none text-gray-900"
                                    placeholder="Present, appearing, or found everywhere."
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vietnamese Meaning (Hidden)</label>
                                <input
                                    type="text"
                                    value={formData.vietnameseMeaning || ''}
                                    onChange={e => setFormData({ ...formData, vietnameseMeaning: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-gray-900"
                                    placeholder="Có mặt ở khắp mọi nơi"
                                />
                            </div>
                            <div>
                                <label className="block flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    IPA Spelling (Auto-generated)
                                    {isFetchingIpa && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                                </label>
                                <input
                                    type="text"
                                    value={formData.ipaSpelling || ''}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl outline-none text-sm font-mono text-gray-500 cursor-not-allowed"
                                    placeholder="e.g. juːˈbɪkwɪtəs"
                                />
                            </div>

                            <div className="pt-4 flex gap-3 flex-row-reverse border-t border-gray-100">
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
                                    {editingVocab ? 'Save Changes' : 'Add Word'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
