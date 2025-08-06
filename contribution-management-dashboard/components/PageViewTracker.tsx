import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

const PageViewTracker: React.FC = () => {
    const { token, isAuthenticated } = useAuth();
    const location = useLocation();
    const lastTrackedPath = useRef<string | null>(null);

    useEffect(() => {
        // Only track if authenticated and the path has changed since the last track
        if (isAuthenticated && token && location.pathname !== lastTrackedPath.current) {
            fetch(`${API_URL}/track-access`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pagePath: location.pathname,
                }),
            }).then(response => {
                if (response.ok) {
                    lastTrackedPath.current = location.pathname;
                } else if (response.status === 401) {
                    // This implies the token is bad, but AuthContext will handle logout.
                    // No need to call logout() here to avoid duplicate calls.
                }
            }).catch(error => {
                // This is a background task, so we just log errors without alerting the user.
                console.error("Failed to track page access:", error);
            });
        }
    }, [location.pathname, isAuthenticated, token]);

    return null; // This component does not render anything
};

export default PageViewTracker;