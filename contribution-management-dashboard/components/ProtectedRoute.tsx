
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactElement;
    permission: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
    const { isAuthenticated, hasPermission, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // You can render a loading spinner here if you want
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!hasPermission(permission)) {
        return <Navigate to="/forbidden" replace />;
    }

    return children;
};

export default ProtectedRoute;
