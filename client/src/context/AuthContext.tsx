import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../services/apiClient';

/**
 * Converts a username into a pseudo-email for Firebase Auth.
 * Firebase requires an email format, but users log in with username only.
 */
const toEmail = (username: string): string => {
    const trimmed = username.toLowerCase().trim();
    // If it's already an email, use it as-is
    return trimmed.includes('@') ? trimmed : `${trimmed}@ieltsapp.local`;
};

interface AuthContextType {
    user: User | null;
    role: string | null;
    loading: boolean;

    loginWithUsername: (username: string, password: string) => Promise<void>;
    registerWithRole: (username: string, password: string, name: string, role: 'student' | 'teacher') => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    checkEmailVerified: () => Promise<boolean>;
    getUserRole: () => Promise<string | null>;
    logout: () => Promise<void>;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Fetch authoritative profile from Postgres (via API)
                    // We need the ID token to be ready first, which onAuthStateChanged guarantees
                    console.log("[AuthContext] Fetching user profile from /api/users/me...");
                    const token = await currentUser.getIdToken();
                    const userProfile = await apiClient.get('/users/me', token);
                    console.log("[AuthContext] Profile fetched:", userProfile);
                    setRole(userProfile.role || null);
                } catch (error) {
                    console.error("[AuthContext] Error fetching role from API:", error);
                    setRole(null);
                }
            } else {
                setRole(null);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);



    // Username/Password Sign-In (converts username → pseudo-email)
    const loginWithUsername = async (username: string, password: string) => {
        await signInWithEmailAndPassword(auth, toEmail(username), password);
    };

    /**
     * Register a new user.
     * 1. Calls the backend to create the user via Admin SDK + set Custom Claims
     * 2. Then signs in locally so the user is authenticated immediately
     * 3. If real email, sends verification email automatically
     */
    const registerWithRole = async (
        username: string,
        password: string,
        name: string,
        role: 'student' | 'teacher'
    ) => {
        // 1. Call backend to create user + set custom claims
        await apiClient.post('/auth/register', {
            username,
            password,
            name,
            role,
        });

        // 2. Sign in locally so the user gets an ID token
        await signInWithEmailAndPassword(auth, toEmail(username), password);

        // 3. Auto-send verification email if real email
        const isRealEmail = username.includes('@') && !username.endsWith('@ieltsapp.local');
        if (isRealEmail && auth.currentUser) {
            try {
                await sendEmailVerification(auth.currentUser);
            } catch (error) {
                console.error('Failed to send verification email:', error);
                // Don't throw - registration was successful, just email send failed
            }
        }
    };

    /**
     * Get the user's role.
     * Returns the role stored in the context state (fetched from Postgres).
     */
    const getUserRole = async (): Promise<string | null> => {
        return role;
    };

    // Password Reset
    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    /**
     * Send email verification to the current user.
     * Only works if the user has a real email (not pseudo-email).
     */
    const sendVerificationEmail = async () => {
        if (!user) throw new Error('No user is currently signed in.');

        // Check if this is a real email (not pseudo-email)
        if (user.email && !user.email.endsWith('@ieltsapp.local')) {
            await sendEmailVerification(user);
        } else {
            throw new Error('Cannot send verification email to pseudo-email address.');
        }
    };

    /**
     * Reload user data and check if email is verified.
     * Returns true if verified, false otherwise.
     */
    const checkEmailVerified = async (): Promise<boolean> => {
        if (!user) return false;
        await user.reload();
        return user.emailVerified;
    };

    // Sign Out
    const logout = async () => {
        await signOut(auth);
    };

    // Get the ID token to send to the Express server
    const getIdToken = async (): Promise<string | null> => {
        if (!user) return null;
        return user.getIdToken();
    };

    const value: AuthContextType = {
        user,
        role,
        loading,

        loginWithUsername,
        registerWithRole,
        resetPassword,
        sendVerificationEmail,
        checkEmailVerified,
        getUserRole,
        logout,
        getIdToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for easy access
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
