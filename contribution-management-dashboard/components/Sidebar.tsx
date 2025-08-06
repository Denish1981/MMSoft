
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon } from './icons/HomeIcon';
import { ContributionIcon } from './icons/DonateIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { StoreIcon } from './icons/StoreIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { DocumentAddIcon } from './icons/DocumentAddIcon';

interface NavItemProps {
    to: string;
    isCollapsed: boolean;
    children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, isCollapsed, children }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `flex items-center py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 rounded-md ${
                isCollapsed ? 'px-3 justify-center' : 'px-4'
            } ${isActive ? 'bg-blue-600 text-white' : ''}`
        }
    >
        {children}
    </NavLink>
);

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
    const { hasPermission } = useAuth();
    
    const navItems = [
        { to: "/", permission: 'page:dashboard:view', icon: <HomeIcon className="w-5 h-5" />, label: "Dashboard" },
        { to: "/contributions", permission: 'page:contributions:view', icon: <ContributionIcon className="w-5 h-5" />, label: "Contributions" },
        { to: "/bulk-add", permission: 'page:bulk-add:view', icon: <DocumentAddIcon className="w-5 h-5" />, label: "Bulk Add" },
        { to: "/donors", permission: 'page:donors:view', icon: <UsersIcon className="w-5 h-5" />, label: "Donors" },
        { to: "/sponsors", permission: 'page:sponsors:view', icon: <BriefcaseIcon className="w-5 h-5" />, label: "Sponsors" },
        { to: "/vendors", permission: 'page:vendors:view', icon: <StoreIcon className="w-5 h-5" />, label: "Vendors" },
        { to: "/expenses", permission: 'page:expenses:view', icon: <ReceiptIcon className="w-5 h-5" />, label: "Expenses" },
        { to: "/quotations", permission: 'page:quotations:view', icon: <ClipboardIcon className="w-5 h-5" />, label: "Quotations" },
        { to: "/budget", permission: 'page:budget:view', icon: <CalculatorIcon className="w-5 h-5" />, label: "Budget" },
        { to: "/campaigns", permission: 'page:campaigns:view', icon: <CampaignIcon className="w-5 h-5" />, label: "Campaigns" },
        { to: "/reports", permission: 'page:reports:view', icon: <ChartBarIcon className="w-5 h-5" />, label: "Reports" },
        { to: "/ai-insights", permission: 'page:ai-insights:view', icon: <SparklesIcon className="w-5 h-5" />, label: "AI Insights" },
        { to: "/user-management", permission: 'page:user-management:view', icon: <UserGroupIcon className="w-5 h-5" />, label: "User Management" },
    ];

    return (
        <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex items-center justify-center py-6 px-4 border-b border-slate-700 ${isCollapsed ? 'h-[65px]' : ''}`}>
                <h1 className={`font-bold text-white tracking-wider transition-all duration-300 ${isCollapsed ? 'text-lg' : 'text-2xl'}`}>
                    {isCollapsed ? 'C-OS' : 'Contribution OS'}
                </h1>
            </div>
            <nav className="flex-1 space-y-2 p-4 pt-4">
                {navItems.map(item => hasPermission(item.permission) && (
                    <NavItem key={item.to} to={item.to} isCollapsed={isCollapsed}>
                        {item.icon}
                        {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </NavItem>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-700">
                <button 
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center py-2 px-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                     <ChevronLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
