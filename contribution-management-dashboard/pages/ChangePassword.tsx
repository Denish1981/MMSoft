import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { LockClosedIcon } from '../components/icons/LockClosedIcon';

const ChangePassword: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 4) {
            setError('New password must be at least 4 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Your password has been changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                
                // Redirect back to dashboard after a few seconds
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            } else {
                setError(data.message || 'Failed to change password. Please check your credentials.');
            }
        } catch (err) {
            console.error('Password change request failed:', err);
            setError('Could not connect to the server. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                {/* Header banner */}
                <div className="bg-slate-800 px-6 py-4 text-white flex items-center gap-3">
                    <LockClosedIcon className="w-5 h-5 text-blue-400" />
                    <div>
                        <h2 className="font-bold text-lg">Change Password</h2>
                        <p className="text-xs text-slate-405">Update your local credentials securely</p>
                    </div>
                </div>

                {/* Form area */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3.5 font-medium">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3.5 font-medium">
                            {success}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="current-password">
                            Current Password
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-550 focus:border-blue-550 text-sm text-slate-800"
                        />
                        <p className="text-xs text-slate-400 mt-1">Leave empty if you signed in with Google and do not have an existing password</p>
                    </div>

                    <hr className="border-slate-100 my-4" />

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="new-password">
                            New Password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password (min. 4 chars)"
                            required
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-550 focus:border-blue-550 text-sm text-slate-800"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="confirm-password">
                            Confirm New Password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-550 focus:border-blue-550 text-sm text-slate-800"
                        />
                    </div>

                    <div className="pt-4 flex justify-between items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Cancel & Go Back
                        </Link>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
