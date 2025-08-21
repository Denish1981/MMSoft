import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
    { to: "/expenses", label: "Expenses" },
    { to: "/vendors", label: "Vendors" },
    { to: "/quotations", label: "Quotations" },
    { to: "/budget", label: "Budget" },
];

const FinanceNavigation: React.FC = () => {
    return (
        <div className="bg-white p-2 rounded-lg shadow-sm">
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
        </div>
    );
};

export default FinanceNavigation;
