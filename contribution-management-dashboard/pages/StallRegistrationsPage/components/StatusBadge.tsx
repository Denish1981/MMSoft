import React from 'react';

// FIX: Changed import path for StallRegistration to resolve module export issue.
import type { StallRegistration } from '../../../types/participants';

interface StatusBadgeProps {
    status: StallRegistration['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusClasses = {
        Pending: "bg-yellow-100 text-yellow-800",
        Approved: "bg-green-100 text-green-800",
        Rejected: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>{status}</span>;
};

export default StatusBadge;
