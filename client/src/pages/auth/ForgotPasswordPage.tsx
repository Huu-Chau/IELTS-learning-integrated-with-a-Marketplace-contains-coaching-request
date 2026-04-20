import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await resetPassword(email);
            setSent(true);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                    setError('No account found with this email address.');
                    break;
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                default:
                    setError(firebaseError.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg">
            <div className="auth-card w-full max-w-md p-8">
                {/* Back Link */}
                <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Login
                </Link>

                {sent ? (
                    /* Success State */
                    <div className="text-center py-4">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            We've sent a password reset link to <strong className="text-gray-700">{email}</strong>.
                            Please check your inbox and follow the instructions.
                        </p>
                        <Link
                            to="/login"
                            className="btn-primary inline-flex px-6 py-2.5"
                        >
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    /* Form State */
                    <>
                        <div className="text-center mb-6">
                            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                <Mail className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
                            <p className="text-gray-500 mt-1 text-sm">
                                Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-2.5"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
