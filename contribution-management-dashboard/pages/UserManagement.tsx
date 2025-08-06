import React, { useState, useEffect } from 'react';
import type { UserForManagement, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { PlusIcon } from '../components/icons/PlusIcon';
import { UserRolesModal } from '../components/UserRolesModal';

const UserManagement: React.FC = () => {
    const { hasPermission, token, logout } = useAuth();
    const [users, setUsers] = useState<UserForManagement[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserForManagement | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [usersRes, rolesRes] = await Promise.all([
                fetch(`${API_URL}/users/management`, { headers }),
                fetch(`${API_URL}/roles`, { headers }),
            ]);

            if (usersRes.status === 401 || rolesRes.status === 401) {
                logout();
                return;
            }

            if (!usersRes.ok || !rolesRes.ok) throw new Error('Failed to fetch user management data');
            setUsers(await usersRes.json());
            setRoles(await rolesRes.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);
    
    const handleManageRolesClick = (user: UserForManagement) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };
    
    const handleCreateUserClick = () => {
        setSelectedUser(null); // null indicates we are creating a new user
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        fetchData(); // Refresh data after modal closes
    };

    if (isLoading) return <div className="text-center p-8">Loading users...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">User Management</h2>
                        <p className="text-sm text-slate-500">Create new users and assign roles to control access.</p>
                    </div>
                    {hasPermission('action:users:manage') && (
                        <button
                            onClick={handleCreateUserClick}
                            className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create User
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Member Since</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles.length > 0 ? user.roles.map(role => (
                                                <span key={role.id} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                    {role.name}
                                                </span>
                                            )) : <span className="text-xs text-red-500">No Roles Assigned</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {hasPermission('action:users:manage') && (
                                            <button 
                                                onClick={() => handleManageRolesClick(user)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Manage Roles
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isModalOpen && (
                <UserRolesModal 
                    user={selectedUser} 
                    allRoles={roles} 
                    onClose={handleModalClose} 
                />
            )}
        </div>
    );
};

export default UserManagement;