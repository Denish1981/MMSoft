import React, { useState, useEffect, useMemo } from 'react';
import type { UserForManagement, Role } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { PlusIcon } from '../components/icons/PlusIcon';
import { UserRolesModal } from '../components/UserRolesModal';
import { PaginationControls } from '../components/PaginationControls';
import { Search, Filter, X, Users } from 'lucide-react';

const UserManagement: React.FC = () => {
    const { hasPermission, token, logout } = useAuth();
    const [users, setUsers] = useState<UserForManagement[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filtering states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

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

    // Reset pagination to first page when filters or rows-per-page change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedRole, rowsPerPage]);

    // Filter users by name/email and role
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            // Filter by name/username/email
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase().trim();
                const matchesName = user.username?.toLowerCase().includes(term);
                if (!matchesName) return false;
            }

            // Filter by role
            if (selectedRole !== 'all') {
                if (selectedRole === 'none') {
                    if (user.roles && user.roles.length > 0) return false;
                } else {
                    const roleIdNum = Number(selectedRole);
                    const hasRole = user.roles?.some(
                        (r) => r.id === roleIdNum || r.name.toLowerCase() === selectedRole.toLowerCase()
                    );
                    if (!hasRole) return false;
                }
            }

            return true;
        });
    }, [users, searchTerm, selectedRole]);

    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredUsers, currentPage, rowsPerPage]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedRole('all');
    };

    const hasActiveFilters = searchTerm.trim() !== '' || selectedRole !== 'all';
    
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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

                {/* Filters Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        {/* Name / Email Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filter by Name / Email
                            </label>
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label="Clear name search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filter by Role
                            </label>
                            <div className="relative">
                                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    aria-label="Filter by role"
                                >
                                    <option value="all">All Roles</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id.toString()}>
                                            {role.name}
                                        </option>
                                    ))}
                                    <option value="none">No Roles Assigned</option>
                                </select>
                            </div>
                        </div>

                        {/* Filter Status / Reset */}
                        <div className="flex items-center gap-3">
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md text-sm font-medium transition-colors"
                                >
                                    Reset Filters
                                </button>
                            )}
                            <div className="text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{filteredUsers.length}</span> of <span className="font-semibold text-slate-700">{users.length}</span> users
                            </div>
                        </div>
                    </div>
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
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Users className="w-8 h-8 text-slate-400" />
                                            <p className="text-sm font-medium text-slate-600">No users found</p>
                                            <p className="text-xs text-slate-400">
                                                {hasActiveFilters
                                                    ? 'Try adjusting your search term or role filter to see results.'
                                                    : 'No users exist in the system.'}
                                            </p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredUsers.length > 0 && (
                    <PaginationControls
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredUsers.length}
                        onPreviousPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    />
                )}
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