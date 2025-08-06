
import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
    const { login, googleLogin } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await login(username, password);
        if (!result.success) {
            setError(result.message || 'Invalid username or password.');
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
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-wider">Contribution OS</h1>
                    <p className="mt-2 text-slate-500">Sign in to access your dashboard</p>
                </div>
                
                <div className="flex justify-center">
                   <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap />
                </div>

                <div className="flex items-center justify-center space-x-2">
                    <hr className="w-full border-slate-200" />
                    <span className="text-xs font-medium text-slate-400">OR</span>
                    <hr className="w-full border-slate-200" />
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                            Username / Email
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="your@email.com"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-slate-700">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="password"
                            disabled={isLoading}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
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
