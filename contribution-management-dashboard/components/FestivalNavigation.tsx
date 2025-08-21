import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

const navItems = [
    { to: 'events', label: "Events" },
    { to: 'photos', label: "Photos" },
];

interface FestivalNavigationProps {
    festivalId: string;
    festivalName?: string;
}

const FestivalNavigation: React.FC<FestivalNavigationProps> = ({ festivalId, festivalName }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
            <div className="flex items-center space-x-4">
                <Link to="/festivals" className="text-slate-500 hover:text-slate-800" aria-label="Back to festivals">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Link>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Manage Festival</h2>
                    <p className="text-slate-600">{festivalName || 'Loading...'}</p>
                </div>
            </div>
             <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center space-x-2 flex-wrap">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={`/festivals/${festivalId}/${item.to}`}
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
        </div>
    );
};

export default FestivalNavigation;
