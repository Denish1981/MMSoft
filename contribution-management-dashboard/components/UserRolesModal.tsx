import React, { useState, useEffect } from 'react';
import type { UserForManagement, Role } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface UserRolesModalProps {
    user: UserForManagement | null; // null for creating a new user
    allRoles: Role[];
    onClose: () => void;
}

export const UserRolesModal: React.FC<UserRolesModalProps> = ({ user, allRoles, onClose }) => {
    const { token, logout } = useAuth();
    const isCreating = user === null;
    const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // New user form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (user) {
            setSelectedRoleIds(new Set(user.roles.map(r => r.id)));
        }
    }, [user]);

    const handleRoleChange = (roleId: number) => {
        const newSelectedRoleIds = new Set(selectedRoleIds);
        if (newSelectedRoleIds.has(roleId)) {
            newSelectedRoleIds.delete(roleId);
        } else {
            newSelectedRoleIds.add(roleId);
        }
        setSelectedRoleIds(newSelectedRoleIds);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let response;
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            if (isCreating) {
                // Logic to create a new user
                response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ 
                        username, 
                        password, 
                        roleIds: Array.from(selectedRoleIds) 
                    }),
                });
            } else {
                // Logic to update an existing user's roles
                response = await fetch(`${API_URL}/users/${user.id}/roles`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ roleIds: Array.from(selectedRoleIds) }),
                });
            }
            
            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'An unexpected error occurred.');
            }
            onClose();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isCreating ? 'Create New User' : `Manage Roles for ${user.username}`}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {isCreating && (
                        <>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-slate-700">User Email</label>
                                <input type="email" id="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" required />
                            </div>
                            <div>
                                <label htmlFor="password"className="block text-sm font-medium text-slate-700">Password</label>
                                <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" required />
                            </div>
                        </>
                    )}

                    <div>
                        <h3 className="text-lg font-medium text-slate-800 mb-2">Assign Roles</h3>
                        <div className="space-y-2">
                            {allRoles.map(role => (
                                <div key={role.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`role-${role.id}`}
                                        checked={selectedRoleIds.has(role.id)}
                                        onChange={() => handleRoleChange(role.id)}
                                        className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`role-${role.id}`} className="ml-3 block text-sm font-medium text-slate-700">
                                        {role.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-slate-400">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};