
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

const NavItem: React.FC<{ to: string; children: React.ReactNode; }> = ({ to, children }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 rounded-md ${
                isActive ? 'bg-blue-600 text-white' : ''
            }`
        }
    >
        {children}
    </NavLink>
);

const Sidebar: React.FC<{isAdmin: boolean}> = ({ isAdmin }) => {
    return (
        <div className="w-64 bg-slate-800 text-white flex flex-col p-4 space-y-2">
            <div className="flex items-center justify-center py-6 px-4 border-b border-slate-700">
                <h1 className="text-2xl font-bold text-white tracking-wider">Contribution OS</h1>
            </div>
            <nav className="flex-1 space-y-2 pt-4">
                <NavItem to="/">
                    <HomeIcon className="w-5 h-5 mr-3" />
                    Dashboard
                </NavItem>
                <NavItem to="/contributions">
                    <ContributionIcon className="w-5 h-5 mr-3" />
                    Contributions
                </NavItem>
                <NavItem to="/donors">
                    <UsersIcon className="w-5 h-5 mr-3" />
                    Donors
                </NavItem>
                <NavItem to="/sponsors">
                    <BriefcaseIcon className="w-5 h-5 mr-3" />
                    Sponsors
                </NavItem>
                <NavItem to="/vendors">
                    <StoreIcon className="w-5 h-5 mr-3" />
                    Vendors
                </NavItem>
                <NavItem to="/expenses">
                    <ReceiptIcon className="w-5 h-5 mr-3" />
                    Expenses
                </NavItem>
                <NavItem to="/quotations">
                    <ClipboardIcon className="w-5 h-5 mr-3" />
                    Quotations
                </NavItem>
                <NavItem to="/campaigns">
                    <CampaignIcon className="w-5 h-5 mr-3" />
                    Campaigns
                </NavItem>
                <NavItem to="/reports">
                    <ChartBarIcon className="w-5 h-5 mr-3" />
                    Reports
                </NavItem>
                <NavItem to="/ai-insights">
                    <SparklesIcon className="w-5 h-5 mr-3" />
                    AI Insights
                </NavItem>
                {isAdmin && (
                    <NavItem to="/user-management">
                        <CogIcon className="w-5 h-5 mr-3" />
                        User Management
                    </NavItem>
                )}
            </nav>
            <div className="mt-auto p-4 text-center text-slate-400 text-xs">
                © {new Date().getFullYear()} Contribution OS.
            </div>
        </div>
    );
};

export default Sidebar;
