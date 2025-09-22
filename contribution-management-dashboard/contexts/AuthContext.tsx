import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { AuthUser } from '../types/index';
import { API_URL } from '../config';

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (user: string, pass: string) => Promise<{ success: boolean; message?: string }>;
    googleLogin: (token: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const hasPermission = useCallback((permission: string): boolean => {
        if (!user || !Array.isArray(user.permissions)) {
            return false;
        }
        // Admin has all permissions, defined by having user management rights.
        if (user.permissions.includes('action:users:manage')) {
            return true;
        }
        return user.permissions.includes(permission);
    }, [user]);
    
    const logout = useCallback(async () => {
        const currentToken = localStorage.getItem('contribution-os-token');
        if (currentToken) {
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
            } catch (error) {
                console.error("Failed to call logout endpoint, clearing session locally.", error);
            }
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('contribution-os-token');
        localStorage.removeItem('contribution-os-user'); // Clean up old data too
    }, []);

    const revalidateSession = useCallback(async (tokenToValidate: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${tokenToValidate}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setToken(tokenToValidate);
                localStorage.setItem('contribution-os-token', tokenToValidate);
            } else {
                await logout();
            }
        } catch (error) {
            console.error("Session revalidation failed:", error);
            // Don't log out on network error, user might be offline
        } finally {
            setIsLoading(false);
        }
    }, [logout]);


    useEffect(() => {
        const storedToken = localStorage.getItem('contribution-os-token');
        if (storedToken) {
            revalidateSession(storedToken);
        } else {
            setIsLoading(false);
        }
    }, [revalidateSession]);

    useEffect(() => {
        const handleFocus = () => {
            const storedToken = localStorage.getItem('contribution-os-token');
            if (storedToken) {
                revalidateSession(storedToken);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [revalidateSession]);


    const handleSuccessfulLogin = (loggedInUser: AuthUser, sessionToken: string) => {
        setUser(loggedInUser);
        setToken(sessionToken);
        localStorage.setItem('contribution-os-token', sessionToken);
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
                handleSuccessfulLogin(data.user, data.token);
                return { success: true };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, message: 'Could not connect to server' };
        }
    };

    const googleLogin = async (googleToken: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: googleToken }),
            });
            const data = await response.json();
            if (response.ok) {
                handleSuccessfulLogin(data.user, data.token);
                return { success: true };
            }
            return { success: false, message: data.message || 'Google Sign-In failed.' };
        } catch (error) {
            console.error("Google login failed:", error);
            return { success: false, message: 'Could not connect to the server.' };
        }
    };

    const value = useMemo(() => ({
        isAuthenticated: !!token && !!user,
        user,
        token,
        isLoading,
        login,
        googleLogin,
        logout,
        hasPermission,
    }), [user, token, isLoading, hasPermission, logout]);

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
