import React from 'react';
import { NavLink } from 'react-router-dom';
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
import { CogIcon } from './icons/CogIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';

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
    isAdmin: boolean;
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isAdmin, isCollapsed, toggleSidebar }) => {
    return (
        <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex items-center justify-center py-6 px-4 border-b border-slate-700 ${isCollapsed ? 'h-[65px]' : ''}`}>
                <h1 className={`font-bold text-white tracking-wider transition-all duration-300 ${isCollapsed ? 'text-lg' : 'text-2xl'}`}>
                    {isCollapsed ? 'C-OS' : 'Contribution OS'}
                </h1>
            </div>
            <nav className="flex-1 space-y-2 p-4 pt-4">
                <NavItem to="/" isCollapsed={isCollapsed}>
                    <HomeIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Dashboard</span>}
                </NavItem>
                <NavItem to="/contributions" isCollapsed={isCollapsed}>
                    <ContributionIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Contributions</span>}
                </NavItem>
                <NavItem to="/donors" isCollapsed={isCollapsed}>
                    <UsersIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Donors</span>}
                </NavItem>
                <NavItem to="/sponsors" isCollapsed={isCollapsed}>
                    <BriefcaseIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Sponsors</span>}
                </NavItem>
                <NavItem to="/vendors" isCollapsed={isCollapsed}>
                    <StoreIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Vendors</span>}
                </NavItem>
                <NavItem to="/expenses" isCollapsed={isCollapsed}>
                    <ReceiptIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Expenses</span>}
                </NavItem>
                <NavItem to="/quotations" isCollapsed={isCollapsed}>
                    <ClipboardIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Quotations</span>}
                </NavItem>
                 <NavItem to="/budget" isCollapsed={isCollapsed}>
                    <CalculatorIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Budget</span>}
                </NavItem>
                <NavItem to="/campaigns" isCollapsed={isCollapsed}>
                    <CampaignIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Campaigns</span>}
                </NavItem>
                <NavItem to="/reports" isCollapsed={isCollapsed}>
                    <ChartBarIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">Reports</span>}
                </NavItem>
                <NavItem to="/ai-insights" isCollapsed={isCollapsed}>
                    <SparklesIcon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">AI Insights</span>}
                </NavItem>
                {isAdmin && (
                    <NavItem to="/user-management" isCollapsed={isCollapsed}>
                        <CogIcon className="w-5 h-5" />
                        {!isCollapsed && <span className="ml-3">User Management</span>}
                    </NavItem>
                )}
            </nav>
            <div className="p-4 border-t border-slate-700">
                <button 
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center py-2 px-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                     <ChevronDoubleLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
