
import React, { useState } from 'react';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { PlusIcon } from '../components/icons/PlusIcon';

interface UserManagementProps {
    emails: { id: number; email: string }[];
    onAddEmail: (email: string) => void;
    onDelete: (id: number) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ emails, onAddEmail, onDelete }) => {
    const [newEmail, setNewEmail] = useState('');

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEmail.trim()) {
            onAddEmail(newEmail.trim());
            setNewEmail('');
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Add New Authorized User</h2>
                <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-center gap-4">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Email
                    </button>
                </form>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Authorized Email Addresses</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Only users with these email addresses will be able to sign in using Google.
                </p>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {emails.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{item.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900" title="Delete Email">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
