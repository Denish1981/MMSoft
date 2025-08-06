
import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { AuthUser } from '../types';
import { API_URL } from '../config';

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    isLoading: boolean;
    login: (user: string, pass: string) => Promise<{ success: boolean; message?: string }>;
    googleLogin: (token: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const hasPermission = useCallback((permission: string): boolean => {
        if (!user || !Array.isArray(user.permissions)) {
            return false;
        }
        // Admin has all permissions, defined by having user management rights.
        if (user.permissions.includes('page:user-management:view') && user.permissions.includes('action:users:manage')) {
            return true;
        }
        return user.permissions.includes(permission);
    }, [user]);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('contribution-os-user');
            if (savedUser) {
                const parsedUser: AuthUser = JSON.parse(savedUser);
                // Data integrity check for user object from localStorage
                if (parsedUser && parsedUser.id && parsedUser.email && Array.isArray(parsedUser.permissions)) {
                    setUser(parsedUser);
                } else {
                    console.warn("Malformed user object in localStorage. Clearing session.");
                    localStorage.removeItem('contribution-os-user');
                }
            }
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('contribution-os-user');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSuccessfulLogin = (loggedInUser: AuthUser) => {
        setUser(loggedInUser);
        localStorage.setItem('contribution-os-user', JSON.stringify(loggedInUser));
    };

    const login = async (username: string, pass: string) => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: pass }),
            });
            const data = await response.json();
            if (response.ok) {
                handleSuccessfulLogin(data.user);
                return { success: true };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, message: 'Could not connect to server' };
        }
    };

    const googleLogin = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (response.ok) {
                handleSuccessfulLogin(data.user);
                return { success: true };
            }
            return { success: false, message: data.message || 'Google Sign-In failed.' };
        } catch (error) {
            console.error("Google login failed:", error);
            return { success: false, message: 'Could not connect to the server.' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('contribution-os-user');
    };

    const value = useMemo(() => ({
        isAuthenticated: !!user,
        user,
        isLoading,
        login,
        googleLogin,
        logout,
        hasPermission,
    }), [user, isLoading, hasPermission]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
