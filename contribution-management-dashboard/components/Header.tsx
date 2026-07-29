import React, { useState, useRef, useEffect } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { PlusIcon } from './icons/PlusIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { DocumentAddIcon } from './icons/DocumentAddIcon';
import { MenuIcon } from './icons/MenuIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
    onMobileMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuClick }) => {
    const location = useLocation();
    const { user, hasPermission, logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const { 
        openContributionModal, openSponsorModal, openVendorModal, 
        openExpenseModal, openQuotationModal, openBudgetModal, 
        openFestivalModal, openTaskModal, openEventModal,
        openCampaignModal
    } = useModal();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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

        if (path.startsWith('/donor-portal')) return { title: 'Members', button: null };
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
        if (path.startsWith('/campaigns')) return { title: 'Campaigns', button: createButton(() => openCampaignModal(), 'Add Campaign') };
        if (path.match(/^\/festivals\/\d+\/events$/)) return { title: 'Festival Events', button: createButton(() => openEventModal(), 'Add Event') };
        if (path.match(/^\/festivals\/\d+\/photos$/)) return { title: 'Festival Photos', button: null };
        if (path.match(/^\/festivals\/\d+\/stall-registrations$/)) return { title: 'Manage Stall Registrations', button: null };
        if (path.startsWith('/festivals')) return { title: 'Festivals', button: createButton(() => openFestivalModal(), 'Add Festival') };
        if (path.match(/^\/participants\/.+\/.+$/)) return { title: 'Registration History', button: null };
        if (path.startsWith('/participants')) return { title: 'Unique Participants', button: null };
        if (path.startsWith('/tasks')) return { title: 'Tasks', button: createButton(() => openTaskModal(), 'Add Task') };
        if (path.startsWith('/reports')) return { title: 'Reports', button: null };
        if (path.startsWith('/ai-insights')) return { title: 'AI-Powered Insights', button: null };
        if (path.startsWith('/user-management')) return { title: 'User Management', button: null };
        if (path.startsWith('/archive')) return { title: 'Archive', button: null };
        return { title: 'Dashboard', button: null };
    };

    const { title, button } = getPageDetails();

    const displayName = user
        ? (user.fullName && user.fullName.trim() !== ''
            ? user.fullName
            : (user.username || user.email || 'User'))
        : 'User';

    return (
        <header className="bg-white shadow-sm z-20 relative">
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
                        {user && (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-full text-slate-700 text-xs sm:text-sm font-medium border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    aria-expanded={isUserMenuOpen}
                                    aria-haspopup="true"
                                >
                                    <UserIcon className="w-4 h-4 mr-1.5 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px] font-semibold text-slate-800">
                                        {displayName}
                                    </span>
                                    <svg 
                                        className={`w-4 h-4 ml-1.5 text-slate-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="px-4 py-2 border-b border-slate-100">
                                            <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                                            {(user.username || user.email) && (
                                                <p className="text-xs text-slate-500 truncate">{user.username || user.email}</p>
                                            )}
                                        </div>
                                        <Link 
                                            to="/change-password"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                        >
                                            <LockClosedIcon className="w-4 h-4 mr-2.5 text-slate-500" />
                                            Change Password
                                        </Link>
                                        <button 
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                logout();
                                            }}
                                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                                        >
                                            <LogoutIcon className="w-4 h-4 mr-2.5 text-red-500" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
