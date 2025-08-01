
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LockClosedIcon } from '../components/icons/LockClosedIcon';

const ForbiddenPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-white p-6 rounded-xl shadow-md">
            <LockClosedIcon className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold text-slate-800">Access Denied</h1>
            <p className="mt-2 text-slate-600">You do not have permission to view this page.</p>
            <p className="mt-1 text-sm text-slate-500">
                Please contact the administrator if you believe this is an error.
            </p>
            <NavLink
                to="/"
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                Return to Dashboard
            </NavLink>
        </div>
    );
};

export default ForbiddenPage;
