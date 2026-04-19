import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const MAX_LOADING_MS = 5000; // 5 second timeout

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }): React.ReactElement | null => {
    const { isAuthenticated, loading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setTimedOut(true), MAX_LOADING_MS);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (loading && !timedOut) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-textMuted text-sm animate-pulse">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
