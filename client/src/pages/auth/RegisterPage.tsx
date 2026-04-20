import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';

/** Validation error map keyed by field name */
type FormErrors = Record<string, string>;

export default function RegisterPage() {
    const navigate = useNavigate();
    const { registerWithRole } = useAuth();

    const [form, setForm] = useState({
        fullName: '',
        username: '',
        password: '',
        confirmPassword: '',
        accountType: '' as '' | 'student' | 'teacher',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const copy = { ...prev };
                delete copy[field];
                return copy;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!form.fullName.trim()) newErrors.fullName = 'Full name is required.';
        if (!form.username.trim()) newErrors.username = 'Username or email is required.';
        else if (form.username.length < 3) newErrors.username = 'Must be at least 3 characters.';
        else if (!/^[a-zA-Z0-9_.@]+$/.test(form.username)) newErrors.username = 'Only letters, numbers, underscores, dots, and @.';
        if (!form.password) newErrors.password = 'Password is required.';
        else if (form.password.length < 6) newErrors.password = 'Must be at least 6 characters.';
        if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
        else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
        if (!form.accountType) newErrors.accountType = 'Please select an account type.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getPasswordStrength = (): { label: string; color: string; width: string } => {
        const p = form.password;
        if (!p) return { label: '', color: '', width: '0%' };
        let score = 0;
        if (p.length >= 6) score++;
        if (p.length >= 10) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
        if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
        if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
        if (score <= 4) return { label: 'Strong', color: 'bg-green-500', width: '80%' };
        return { label: 'Very Strong', color: 'bg-emerald-500', width: '100%' };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;

        setLoading(true);
        try {
            // Register via backend (Admin SDK) + auto sign-in
            await registerWithRole(
                form.username,
                form.password,
                form.fullName,
                form.accountType as 'student' | 'teacher'
            );

            // Check if the user has a real email (not pseudo-email)
            const isRealEmail = form.username.includes('@') && !form.username.endsWith('@ieltsapp.local');

            if (isRealEmail) {
                // Redirect to email verification page
                navigate('/verify-email', { replace: true });
            } else {
                // Pseudo-email: redirect directly to dashboard
                const dashboard = form.accountType === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
                navigate(dashboard, { replace: true });
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            // The backend returns user-friendly error messages
            setServerError(error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength();

    return (
        <div className="auth-bg">
            <div className="auth-card w-full max-w-md p-8 my-8">
                {/* Logo / Brand */}
                <div className="text-center mb-6">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-white font-bold text-xl">IE</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
                    <p className="text-gray-500 mt-1 text-sm">Join the IELTS Prep community</p>
                </div>

                {/* Server Error */}
                {serverError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {serverError}
                    </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input id="fullName" type="text" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} className={`input-field ${errors.fullName ? 'input-error' : ''}`} placeholder="John Doe" autoComplete="name" />
                        {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
                    </div>

                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
                        <input id="username" type="text" value={form.username} onChange={(e) => updateField('username', e.target.value)} className={`input-field ${errors.username ? 'input-error' : ''}`} placeholder="johndoe123 or john@example.com" autoComplete="username" />
                        {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" autoComplete="new-password" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        {form.password && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">Password strength</span>
                                    <span className="text-xs font-medium text-gray-600">{strength.label}</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className={`input-field pr-10 ${errors.confirmPassword ? 'input-error' : ''}`} placeholder="••••••••" autoComplete="new-password" />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                    </div>

                    {/* Account Type */}
                    <div>
                        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                        <select id="accountType" value={form.accountType} onChange={(e) => updateField('accountType', e.target.value)} className={`input-field ${errors.accountType ? 'input-error' : ''}`}>
                            <option value="">Select Account Type</option>
                            <option value="student">Student — I want to practice IELTS</option>
                            <option value="teacher">Teacher — I want to help students</option>
                        </select>
                        {errors.accountType && <p className="mt-1 text-xs text-red-600">{errors.accountType}</p>}
                    </div>

                    {/* Submit Button */}
                    <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Create Account
                            </>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
