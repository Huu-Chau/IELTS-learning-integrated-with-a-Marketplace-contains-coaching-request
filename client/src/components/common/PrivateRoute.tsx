import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
    allowedRoles?: ('student' | 'teacher' | 'admin')[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
    const { user, role, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-medium">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles) {
        if (!role || !allowedRoles.includes(role as any)) {
            // If role is known but wrong → redirect to their correct dashboard
            // If role is null (loading/error) → redirect to login
            return <Navigate to={role ? `/dashboard/${role}` : '/login'} replace />;
        }
    }

    return <Outlet />;
};

export default PrivateRoute;
