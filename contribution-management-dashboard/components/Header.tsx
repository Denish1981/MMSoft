import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { PlusIcon } from './icons/PlusIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { DocumentAddIcon } from './icons/DocumentAddIcon';
import { MenuIcon } from './icons/MenuIcon';

interface HeaderProps {
    onMobileMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuClick }) => {
    const location = useLocation();
    const { hasPermission, logout } = useAuth();
    const { 
        openContributionModal, openSponsorModal, openVendorModal, 
        openExpenseModal, openQuotationModal, openBudgetModal, 
        openFestivalModal, openTaskModal, openEventModal
    } = useModal();

    const getPageDetails = () => {
        const path = location.pathname;
        const canCreate = hasPermission('action:create');
        
        const createButton = (onClick: () => void, text: string) => (
            canCreate ? (
                <button
                    key={text}
                    onClick={onClick}
                    className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {text}
                </button>
            ) : null
        );

        if (path.startsWith('/dashboard')) return { title: 'Dashboard', button: null };
        if (path.startsWith('/contributions')) {
            const buttons = [];
            if (hasPermission('page:bulk-add:view')) {
                 buttons.push(
                    <Link
                        key="bulk-add"
                        to="/bulk-add"
                        className="flex items-center justify-center bg-slate-700 text-white px-4 py-2 rounded-lg shadow-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
                    >
                        <DocumentAddIcon className="w-5 h-5 mr-2" />
                        Bulk Add
                    </Link>
                );
            }
            const addContributionButton = createButton(() => openContributionModal(), 'Add Contribution');
            if (addContributionButton) {
                buttons.push(addContributionButton);
            }
            return { title: 'Contributions', button: buttons };
        }
        if (path.startsWith('/bulk-add')) return { title: 'Bulk Add Contributions', button: null };
        if (path.startsWith('/donors')) return { title: 'Donors', button: null };
        if (path.startsWith('/sponsors')) return { title: 'Sponsors', button: createButton(() => openSponsorModal(), 'Add Sponsor') };
        if (path.startsWith('/vendors')) return { title: 'Vendors', button: createButton(() => openVendorModal(), 'Add Vendor') };
        if (path.startsWith('/expenses')) return { title: 'Expenses', button: createButton(() => openExpenseModal(), 'Add Expense') };
        if (path.startsWith('/quotations')) return { title: 'Quotations', button: createButton(() => openQuotationModal(), 'Add Quotation') };
        if (path.startsWith('/budget')) return { title: 'Budget', button: createButton(() => openBudgetModal(), 'Add Budget Item') };
        if (path.startsWith('/campaigns')) return { title: 'Campaigns', button: null };
        if (path.match(/^\/festivals\/\d+\/events$/)) return { title: 'Festival Events', button: createButton(() => openEventModal(), 'Add Event') };
        if (path.match(/^\/festivals\/\d+\/photos$/)) return { title: 'Festival Photos', button: null };
        if (path.startsWith('/festivals')) return { title: 'Festivals', button: createButton(() => openFestivalModal(), 'Add Festival') };
        if (path.startsWith('/tasks')) return { title: 'Tasks', button: createButton(() => openTaskModal(), 'Add Task') };
        if (path.startsWith('/reports')) return { title: 'Reports', button: null };
        if (path.startsWith('/ai-insights')) return { title: 'AI-Powered Insights', button: null };
        if (path.startsWith('/user-management')) return { title: 'User Management', button: null };
        if (path.startsWith('/archive')) return { title: 'Archive', button: null };
        return { title: 'Dashboard', button: null };
    };

    const { title, button } = getPageDetails();

    return (
        <header className="bg-white shadow-sm z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <button 
                           onClick={onMobileMenuClick}
                           className="md:hidden mr-4 text-slate-600 hover:text-slate-900"
                           aria-label="Open sidebar"
                        >
                           <MenuIcon className="w-6 h-6" />
                       </button>
                        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">{title}</h1>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        {button}
                        <button 
                            onClick={logout}
                            className="flex items-center text-slate-600 hover:text-slate-900 focus:outline-none transition-colors duration-200"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="w-5 h-5 md:mr-2"/>
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
