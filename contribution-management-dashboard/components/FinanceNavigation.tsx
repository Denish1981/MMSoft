import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const navItems = [
    { to: "/expenses", label: "Expenses" },
    { to: "/vendors", label: "Vendors" },
    { to: "/quotations", label: "Quotations" },
    { to: "/budget", label: "Budget" },
];

const FinanceNavigation: React.FC = () => {
    const { campaigns, selectedCampaignId, setSelectedCampaignId } = useData();

    return (
        <div className="bg-white p-2 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 flex-wrap">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) =>
                            `px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200 ${
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-200'
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 self-start md:self-auto">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign:</span>
                <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer text-slate-700"
                >
                    <option value="all">All Campaigns</option>
                    {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.financialYear})</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FinanceNavigation;
