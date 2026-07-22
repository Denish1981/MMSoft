
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
    const { isAuthenticated, isLoading: authLoading, login, registerDonor, googleLogin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Donor profile state
    const [fullName, setFullName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [towerNumber, setTowerNumber] = useState('');
    const [flatNumber, setFlatNumber] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/donor-portal';
            const target = from === '/login' ? '/donor-portal' : from;
            navigate(target, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, location]);

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 font-medium">Validating session...</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);

        if (mode === 'login') {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.message || 'Invalid username or password.');
            }
        } else {
            if (!fullName.trim() || !username.trim() || !password.trim()) {
                setError('Name, email, and password are required.');
                setIsLoading(false);
                return;
            }
            const result = await registerDonor({
                username,
                password,
                fullName,
                mobileNumber,
                towerNumber,
                flatNumber
            });
            if (!result.success) {
                setError(result.message || 'Registration failed.');
            } else {
                setSuccessMsg('Registration successful!');
            }
        }
        setIsLoading(false);
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            setIsLoading(true);
            setError('');
            const result = await googleLogin(credentialResponse.credential);
            if (!result.success) {
                setError(result.message || 'Google Sign-In failed. Please try again.');
            }
            setIsLoading(false);
        } else {
            setError('Google Sign-In failed. No credential received.');
        }
    };

    const handleGoogleError = () => {
        setError('Google Sign-In failed. Please try again.');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 py-12 px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-wider">Contribution OS</h1>
                    <p className="mt-2 text-slate-500 text-sm">
                        {mode === 'login' ? 'Sign in to access your portal & updates' : 'Register as a donor user'}
                    </p>
                </div>

                {/* Tab selector */}
                <div className="flex border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                        className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                            mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                        className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                            mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Donor Registration
                    </button>
                </div>

                <div className="flex justify-center pt-2">
                   <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap />
                </div>

                <div className="flex items-center justify-center space-x-2">
                    <hr className="w-full border-slate-200" />
                    <span className="text-xs font-medium text-slate-400">OR</span>
                    <hr className="w-full border-slate-200" />
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="John Doe"
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Username / Email *</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="your@email.com"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Password *</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    {mode === 'register' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="+91 9876543210"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Tower / Block</label>
                                    <input
                                        type="text"
                                        value={towerNumber}
                                        onChange={(e) => setTowerNumber(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Tower A"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Flat Number</label>
                                    <input
                                        type="text"
                                        value={flatNumber}
                                        onChange={(e) => setFlatNumber(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Flat 101"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-xs text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-xs text-green-700 text-center">{successMsg}</p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Complete Registration'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-xs text-slate-400">
                     © {new Date().getFullYear()} Contribution OS. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
