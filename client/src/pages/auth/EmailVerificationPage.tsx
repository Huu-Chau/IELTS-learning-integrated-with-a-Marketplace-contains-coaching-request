import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Email Verification Page
 * Shown after registration to prompt users to verify their email address.
 */
const EmailVerificationPage: React.FC = () => {
    const { user, role, sendVerificationEmail, checkEmailVerified } = useAuth();
    const navigate = useNavigate();

    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Handle resending verification email
    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;

        setIsResending(true);
        setError(null);
        setSuccess(null);

        try {
            await sendVerificationEmail();
            setSuccess('Verification email sent! Please check your inbox.');

            // Set cooldown to 60 seconds
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to send verification email.');
        } finally {
            setIsResending(false);
        }
    };

    // Handle checking verification status
    const handleCheckVerification = async () => {
        setVerifying(true);
        setError(null);
        setSuccess(null);

        try {
            const isVerified = await checkEmailVerified();

            if (isVerified) {
                setSuccess('Email verified successfully! Redirecting...');
                setTimeout(() => {
                    // Redirect based on user role
                    if (role === 'teacher') {
                        navigate('/dashboard/teacher');
                    } else if (role === 'admin') {
                        navigate('/dashboard/admin');
                    } else {
                        navigate('/dashboard/student');
                    }
                }, 2000);
            } else {
                setError('Email not yet verified. Please check your inbox and click the verification link.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to check verification status.');
        } finally {
            setVerifying(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Mail className="w-10 h-10 text-blue-400" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white text-center mb-2">
                    Verify Your Email
                </h1>
                <p className="text-gray-400 text-center mb-6">
                    We've sent a verification link to:
                </p>
                <p className="text-blue-400 text-center font-semibold mb-8">
                    {user.email}
                </p>

                {/* Instructions */}
                <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
                    <ol className="text-gray-300 text-sm space-y-2">
                        <li className="flex items-start">
                            <span className="text-blue-400 font-semibold mr-2">1.</span>
                            Check your inbox (and spam folder)
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-400 font-semibold mr-2">2.</span>
                            Click the verification link in the email
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-400 font-semibold mr-2">3.</span>
                            Return here and click "I've Verified My Email"
                        </li>
                    </ol>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <p className="text-green-300 text-sm">{success}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    {/* Check Verification Button */}
                    <button
                        onClick={handleCheckVerification}
                        disabled={verifying}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {verifying ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Checking...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                I've Verified My Email
                            </>
                        )}
                    </button>

                    {/* Resend Email Button */}
                    <button
                        onClick={handleResendEmail}
                        disabled={isResending || resendCooldown > 0}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isResending ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Sending...
                            </>
                        ) : resendCooldown > 0 ? (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Resend in {resendCooldown}s
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Resend Verification Email
                            </>
                        )}
                    </button>
                </div>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;
