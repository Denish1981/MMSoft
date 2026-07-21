import React from 'react';
import { ContributionStatus } from '../types/index';

interface ContributionStatusBadgeProps {
    status: ContributionStatus;
}

export const ContributionStatusBadge: React.FC<ContributionStatusBadgeProps> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    const statusClasses = {
        [ContributionStatus.Completed]: "bg-green-100 text-green-800",
        [ContributionStatus.Pending]: "bg-yellow-100 text-yellow-800",
        [ContributionStatus.Failed]: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};
