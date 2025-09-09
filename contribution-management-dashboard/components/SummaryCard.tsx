import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/formatting';

interface BreakdownItem {
    label: string;
    value: number;
    color: string;
    path?: string;
}

interface SummaryCardProps {
    title: string;
    totalValue: number;
    icon: React.ReactNode;
    breakdown: BreakdownItem[];
    className?: string;
    headerControls?: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, totalValue, icon, breakdown, className = '', headerControls }) => {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        {headerControls}
                    </div>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                        {formatCurrency(totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                    {icon}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Breakdown</p>
                <div className="space-y-2">
                    {breakdown.map((item, index) => {
                        const content = (
                            <>
                                <div className="flex items-center">
                                    <span className={`w-2.5 h-2.5 rounded-full mr-3 ${item.color}`}></span>
                                    <span className="text-slate-600">{item.label}</span>
                                </div>
                                <span className="font-semibold text-slate-800">
                                    {formatCurrency(item.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                            </>
                        );

                        if (item.path) {
                            return (
                                <Link
                                    to={item.path}
                                    key={index}
                                    className="flex justify-between items-center text-sm p-1.5 -m-1.5 rounded-md hover:bg-slate-100 transition-colors duration-200"
                                >
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <div key={index} className="flex justify-between items-center text-sm p-1.5 -m-1.5">
                                {content}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;