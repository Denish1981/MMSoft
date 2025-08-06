import React from 'react';
import { useLocation } from 'react-router-dom';
import { PlusIcon } from './icons/PlusIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface HeaderProps {
    onAddContributionClick: () => void;
    onAddSponsorClick: () => void;
    onAddVendorClick: () => void;
    onAddExpenseClick: () => void;
    onAddQuotationClick: () => void;
    onAddBudgetClick: () => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddContributionClick, onAddSponsorClick, onAddVendorClick, onAddExpenseClick, onAddQuotationClick, onAddBudgetClick, onLogout }) => {
    const location = useLocation();

    const getPageDetails = () => {
        const path = location.pathname;
        if (path === '/') return { title: 'Dashboard', button: null };
        if (path.startsWith('/contributions')) {
            return { 
                title: 'Contributions', 
                button: (
                    <button
                        onClick={onAddContributionClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Contribution
                    </button>
                )
            };
        }
        if (path.startsWith('/donors')) return { title: 'Donors', button: null };
        if (path.startsWith('/sponsors')) {
             return { 
                title: 'Sponsors', 
                button: (
                    <button
                        onClick={onAddSponsorClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Sponsor
                    </button>
                )
            };
        }
        if (path.startsWith('/vendors')) {
             return { 
                title: 'Vendors', 
                button: (
                    <button
                        onClick={onAddVendorClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Vendor
                    </button>
                )
            };
        }
         if (path.startsWith('/expenses')) {
             return { 
                title: 'Expenses', 
                button: (
                    <button
                        onClick={onAddExpenseClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Expense
                    </button>
                )
            };
        }
        if (path.startsWith('/quotations')) {
             return { 
                title: 'Quotations', 
                button: (
                    <button
                        onClick={onAddQuotationClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Quotation
                    </button>
                )
            };
        }
        if (path.startsWith('/budget')) {
             return { 
                title: 'Budget', 
                button: (
                    <button
                        onClick={onAddBudgetClick}
                        className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Budget Item
                    </button>
                )
            };
        }
        if (path.startsWith('/campaigns')) return { title: 'Campaigns', button: null };
        if (path.startsWith('/reports')) return { title: 'Reports', button: null };
        if (path.startsWith('/ai-insights')) return { title: 'AI-Powered Insights', button: null };
        if (path.startsWith('/user-management')) return { title: 'User Management', button: null };
        return { title: 'Dashboard', button: null };
    };

    const { title, button } = getPageDetails();

    return (
        <header className="bg-white shadow-sm z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                    <div className="flex items-center space-x-4">
                        {button}
                        <button 
                            onClick={onLogout}
                            className="flex items-center text-slate-600 hover:text-slate-900 focus:outline-none transition-colors duration-200"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="w-5 h-5 mr-2"/>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
