
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
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';

interface NavItemProps {
    to: string;
    isCollapsed: boolean;
    label: string;
    children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, isCollapsed, label, children }) => (
    <NavLink
        to={to}
        end
        title={isCollapsed ? label : undefined}
        className={({ isActive }) =>
            `flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 rounded-md ${
                isCollapsed ? 'justify-center' : ''
            } ${
                isActive ? 'bg-blue-600 text-white' : ''
            }`
        }
    >
        {children}
    </NavLink>
);

interface SidebarProps {
    isAdmin: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isAdmin, isCollapsed, onToggle }) => {
    return (
        <div className={`bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="flex items-center justify-center py-6 px-4 border-b border-slate-700 h-[88px] shrink-0">
                {!isCollapsed ? (
                    <h1 className="text-2xl font-bold text-white tracking-wider">Contribution OS</h1>
                ) : (
                    <SparklesIcon className="w-8 h-8 text-white" />
                )}
            </div>

            <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
                <NavItem to="/" isCollapsed={isCollapsed} label="Dashboard">
                    <HomeIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Dashboard</span>}
                </NavItem>
                <NavItem to="/contributions" isCollapsed={isCollapsed} label="Contributions">
                    <ContributionIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Contributions</span>}
                </NavItem>
                <NavItem to="/donors" isCollapsed={isCollapsed} label="Donors">
                    <UsersIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Donors</span>}
                </NavItem>
                <NavItem to="/sponsors" isCollapsed={isCollapsed} label="Sponsors">
                    <BriefcaseIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Sponsors</span>}
                </NavItem>
                <NavItem to="/vendors" isCollapsed={isCollapsed} label="Vendors">
                    <StoreIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Vendors</span>}
                </NavItem>
                <NavItem to="/expenses" isCollapsed={isCollapsed} label="Expenses">
                    <ReceiptIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Expenses</span>}
                </NavItem>
                <NavItem to="/quotations" isCollapsed={isCollapsed} label="Quotations">
                    <ClipboardIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Quotations</span>}
                </NavItem>
                <NavItem to="/campaigns" isCollapsed={isCollapsed} label="Campaigns">
                    <CampaignIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Campaigns</span>}
                </NavItem>
                <NavItem to="/reports" isCollapsed={isCollapsed} label="Reports">
                    <ChartBarIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">Reports</span>}
                </NavItem>
                <NavItem to="/ai-insights" isCollapsed={isCollapsed} label="AI Insights">
                    <SparklesIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">AI Insights</span>}
                </NavItem>
                {isAdmin && (
                    <NavItem to="/user-management" isCollapsed={isCollapsed} label="User Management">
                        <CogIcon className={`w-5 h-5 shrink-0 ${!isCollapsed && 'mr-3'}`} />
                        {!isCollapsed && <span className="truncate">User Management</span>}
                    </NavItem>
                )}
            </nav>
            
            <div className="p-4 border-t border-slate-700 shrink-0">
                <button
                    onClick={onToggle}
                    className="flex items-center w-full py-2 px-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors justify-center"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <ChevronDoubleLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
                <div className={`mt-4 text-center text-slate-400 text-xs ${isCollapsed ? 'hidden' : ''}`}>
                    © {new Date().getFullYear()} Contribution OS.
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
