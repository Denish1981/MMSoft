

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon } from './icons/HomeIcon';
import { ContributionIcon } from './icons/DonateIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { StoreIcon } from './icons/StoreIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { CheckSquareIcon } from './icons/CheckSquareIcon';
import { ArchiveIcon } from './icons/ArchiveIcon';
import { CameraIcon } from './icons/CameraIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface NavItemProps {
    to: string;
    isCollapsed: boolean;
    onClick?: () => void;
    children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, isCollapsed, onClick, children }) => (
    <NavLink
        to={to}
        end
        onClick={onClick}
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
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar, isMobileOpen, onMobileClose }) => {
    const { hasPermission } = useAuth();
    
    const publicNavItems = [
        { to: "/", icon: <CameraIcon className="w-5 h-5" />, label: "Photo Albums" },
    ];
    
    const navItems = [
        { to: "/dashboard", permission: 'page:dashboard:view', icon: <HomeIcon className="w-5 h-5" />, label: "Dashboard" },
        { to: "/festivals", permission: 'page:festivals:view', icon: <CalendarIcon className="w-5 h-5" />, label: "Festivals" },
        { to: "/tasks", permission: 'page:tasks:view', icon: <CheckSquareIcon className="w-5 h-5" />, label: "Tasks" },
        { to: "/contributions", permission: 'page:contributions:view', icon: <ContributionIcon className="w-5 h-5" />, label: "Contributions" },
        // { to: "/donors", permission: 'page:donors:view', icon: <UsersIcon className="w-5 h-5" />, label: "Donors" },
        { to: "/expenses", permission: 'page:expenses:view', icon: <ReceiptIcon className="w-5 h-5" />, label: "Expenses" },
        { to: "/campaigns", permission: 'page:campaigns:view', icon: <CampaignIcon className="w-5 h-5" />, label: "Campaigns" },
        { to: "/reports", permission: 'page:reports:view', icon: <ChartBarIcon className="w-5 h-5" />, label: "Reports" },
        // { to: "/ai-insights", permission: 'page:ai-insights:view', icon: <SparklesIcon className="w-5 h-5" />, label: "AI Insights" },
        { to: "/user-management", permission: 'page:user-management:view', icon: <UserGroupIcon className="w-5 h-5" />, label: "User Management" },
        { to: "/archive", permission: 'page:archive:view', icon: <ArchiveIcon className="w-5 h-5" />, label: "Archive" },
    ];

    const showCollapsedContent = isCollapsed && !isMobileOpen;

    return (
        <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white flex flex-col transition-transform duration-300 ease-in-out z-30 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className={`flex items-center justify-center py-6 px-4 border-b border-slate-700 flex-shrink-0 ${showCollapsedContent ? 'h-[65px]' : ''}`}>
                <h1 className={`font-bold text-white tracking-wider transition-all duration-300 ${showCollapsedContent ? 'text-lg' : 'text-2xl'}`}>
                    {showCollapsedContent ? 'C-OS' : 'Contribution OS'}
                </h1>
            </div>
            <nav className="flex-1 space-y-2 p-4 pt-4 overflow-y-auto">
                {publicNavItems.map(item => (
                    <NavItem key={item.to} to={item.to} isCollapsed={showCollapsedContent} onClick={onMobileClose}>
                        {item.icon}
                        {!showCollapsedContent && <span className="ml-3">{item.label}</span>}
                    </NavItem>
                ))}
                
                <hr className="border-slate-700 my-2" />
                
                {navItems.map(item => hasPermission(item.permission) && (
                    <NavItem key={item.to} to={item.to} isCollapsed={showCollapsedContent} onClick={onMobileClose}>
                        {item.icon}
                        {!showCollapsedContent && <span className="ml-3">{item.label}</span>}
                    </NavItem>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-700 flex-shrink-0">
                <button 
                    onClick={toggleSidebar}
                    className="w-full hidden md:flex items-center justify-center py-2 px-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                     <ChevronLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;