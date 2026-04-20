import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function LoginPage() {
    const navigate = useNavigate();
    const { user, role, loading: authLoading, loginWithUsername } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    // Only redirect after an explicit login attempt in this session
    const [pendingRedirect, setPendingRedirect] = useState(false);

    /**
     * Watch for AuthContext to finish loading the role AFTER a successful login.
     * This avoids the race condition where navigate() fires before onAuthStateChanged
     * has finished fetching the role from the API — which caused PrivateRoute to
     * see role=null and bounce back to /login on the first attempt.
     */
    useEffect(() => {
        if (!pendingRedirect) return;       // Don't redirect on initial load
        if (authLoading) return;            // Wait for onAuthStateChanged to fully resolve
        if (!user || !role) return;         // Wait for both user + role to be available

        console.log('[LoginPage] Auth settled, redirecting', { role });
        if (role === 'teacher') {
            navigate('/teacher/dashboard', { replace: true });
        } else if (role === 'admin') {
            navigate('/dashboard/admin', { replace: true });
        } else {
            navigate('/dashboard/student', { replace: true });
        }
    }, [pendingRedirect, authLoading, user, role, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFormLoading(true);

        try {
            // Set Firebase persistence based on "Remember Me"
            await setPersistence(
                auth,
                rememberMe ? browserLocalPersistence : browserSessionPersistence
            );

            // Trigger Firebase login — onAuthStateChanged in AuthContext will fetch
            // the role from the API async. The useEffect above will do the redirect
            // once role is available, avoiding the race condition.
            await loginWithUsername(username, password);
            setPendingRedirect(true);   // Signal the useEffect to watch for redirect

        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                    setError('No account found with this username.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password. Please try again.');
                    break;
                case 'auth/invalid-credential':
                    setError('Invalid username or password. Please try again.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many attempts. Please try again later.');
                    break;
                default:
                    setError(firebaseError.message || 'Login failed. Please try again.');
            }
            setPendingRedirect(false);
        } finally {
            setFormLoading(false);
        }
    };



    return (
        <div className="auth-bg">
            <div className="auth-card w-full max-w-md p-8">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-white font-bold text-xl">IE</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500 mt-1 text-sm">Sign in to your IELTS Prep account</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
                        <input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="johndoe123 or john@example.com" autoComplete="username" />
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me & Forgot Password Row */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                Remember me
                            </span>
                        </label>
                        <Link
                            to="/forgot-password"
                            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Login Button */}
                    <button type="submit" disabled={formLoading || pendingRedirect} className="btn-primary w-full py-2.5">
                        {(formLoading || pendingRedirect) ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <LogIn className="h-4 w-4 mr-2" />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <p className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Create New Account</Link>
                </p>
            </div>
        </div>
    );
}
