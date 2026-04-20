import React, { useState, useEffect } from 'react';

interface ResultFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const ResultFormModal: React.FC<ResultFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [date, setDate] = useState('');
    const [reading, setReading] = useState<number | ''>('');
    const [listening, setListening] = useState<number | ''>('');
    const [writing, setWriting] = useState<number | ''>('');
    const [speaking, setSpeaking] = useState<number | ''>('');
    const [overall, setOverall] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-calculate overall if all 4 are filled
    useEffect(() => {
        if (reading !== '' && listening !== '' && writing !== '' && speaking !== '') {
            const sum = Number(reading) + Number(listening) + Number(writing) + Number(speaking);
            const rawAvg = sum / 4;
            // Round to nearest 0.5
            const rounded = Math.round(rawAvg * 2) / 2;
            setOverall(rounded);
        }
    }, [reading, listening, writing, speaking]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('[ResultFormModal] handleSubmit called');
            setIsSubmitting(true);
            await onSubmit({
                date: date || new Date().toISOString(),
                reading: Number(reading),
                listening: Number(listening),
                writing: Number(writing),
                speaking: Number(speaking),
                overall: Number(overall),
            });
            console.log('[ResultFormModal] handleSubmit success');
            onClose();
        } catch (error) {
            console.error('[ResultFormModal] handleSubmit error', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Log Test Result</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Test Date
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reading
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    required
                                    value={reading}
                                    onChange={(e) => setReading(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Listening
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    required
                                    value={listening}
                                    onChange={(e) => setListening(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Writing
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    required
                                    value={writing}
                                    onChange={(e) => setWriting(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Speaking
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    required
                                    value={speaking}
                                    onChange={(e) => setSpeaking(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Overall Score
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="9"
                                required
                                value={overall}
                                onChange={(e) => setOverall(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="pt-4 flex items-center justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Result'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResultFormModal;
