
import React from 'react';

interface DashboardCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'increase' | 'decrease';
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, change, changeType }) => {
    const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-start justify-between hover:shadow-lg transition-shadow duration-300">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
                 {change && (
                    <p className={`text-sm mt-2 ${changeColor}`}>
                       {change} vs last month
                    </p>
                )}
            </div>
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                {icon}
            </div>
        </div>
    );
};

export default DashboardCard;
