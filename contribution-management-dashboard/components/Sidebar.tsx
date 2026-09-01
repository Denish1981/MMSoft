

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon } from './icons/HomeIcon';
import { ContributionIcon } from './icons/DonateIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ArchiveIcon } from './icons/ArchiveIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { DashboardIcon } from './icons/DashboardIcon';
import { HelpIcon } from './icons/HelpIcon';
import { TicketIcon } from './icons/TicketIcon';

interface NavItemProps {
    to: string;
    isCollapsed: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, isCollapsed, onClick, children, isSubItem = false }) => (
    <NavLink
        to={to}
        end={to === '/' || to === '/donor-portal' || to === '/dashboard'}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center ${isSubItem ? 'py-2 text-sm' : 'py-2.5 text-base'} text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 rounded-md ${
                isCollapsed ? 'px-3 justify-center' : isSubItem ? 'pl-9 pr-3' : 'px-4'
            } ${isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : ''}`
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

interface NavSubItem {
    to: string;
    permission: string;
    icon: React.ReactNode;
    label: string;
}

interface NavGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: NavSubItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar, isMobileOpen, onMobileClose }) => {
    const { hasPermission } = useAuth();
    const location = useLocation();

    // Standalone top links: Unchanged for Donor and all users
    const publicNavItems = [
        { to: "/", icon: <HomeIcon className="w-5 h-5 flex-shrink-0" />, label: "Home" },
    ];

    const standaloneNavItems = [
        { to: "/donor-portal", permission: 'page:donor-portal:view', icon: <ContributionIcon className="w-5 h-5 flex-shrink-0" />, label: "Members" },
        { to: "/dashboard", permission: 'page:dashboard:view', icon: <DashboardIcon className="w-5 h-5 flex-shrink-0" />, label: "Dashboard" },
    ];

    // Grouped links for operational and management roles
    const navGroups: NavGroup[] = [
        {
            id: 'events',
            label: 'Events',
            icon: <CalendarIcon className="w-5 h-5 flex-shrink-0" />,
            items: [
                { to: "/festivals", permission: 'page:festivals:view', icon: <CalendarIcon className="w-4 h-4 flex-shrink-0" />, label: "Festivals" },
                { to: "/schedules", permission: 'page:schedules:view', icon: <CalendarIcon className="w-4 h-4 flex-shrink-0" />, label: "Schedules" },
                { to: "/participants", permission: 'page:participants:view', icon: <UsersIcon className="w-4 h-4 flex-shrink-0" />, label: "Participants" },
                { to: "/food-coupons", permission: 'page:food-coupons:view', icon: <TicketIcon className="w-4 h-4 flex-shrink-0" />, label: "Food Coupons" },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: <ReceiptIcon className="w-5 h-5 flex-shrink-0" />,
            items: [
                { to: "/contributions", permission: 'page:contributions:view', icon: <ContributionIcon className="w-4 h-4 flex-shrink-0" />, label: "Contributions" },
                { to: "/expenses", permission: 'page:expenses:view', icon: <ReceiptIcon className="w-4 h-4 flex-shrink-0" />, label: "Expenses" },
                { to: "/campaigns", permission: 'page:campaigns:view', icon: <CampaignIcon className="w-4 h-4 flex-shrink-0" />, label: "Campaigns" },
            ]
        },
        {
            id: 'admin',
            label: 'Administration',
            icon: <UserGroupIcon className="w-5 h-5 flex-shrink-0" />,
            items: [
                { to: "/user-management", permission: 'page:user-management:view', icon: <UserGroupIcon className="w-4 h-4 flex-shrink-0" />, label: "User Management" },
                { to: "/archive", permission: 'page:archive:view', icon: <ArchiveIcon className="w-4 h-4 flex-shrink-0" />, label: "Archive" },
                { to: "/documentation", permission: 'page:dashboard:view', icon: <HelpIcon className="w-4 h-4 flex-shrink-0" />, label: "Help & Guide" },
            ]
        }
    ];

    const standaloneEndItems = [
        { to: "/reports", permission: 'page:reports:view', icon: <ChartBarIcon className="w-5 h-5 flex-shrink-0" />, label: "Reports" },
    ];

    // Manage expanded/collapsed state for each group
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {
            events: false,
            finance: false,
            admin: false,
        };
        // Auto-expand group if current route matches
        navGroups.forEach(group => {
            if (group.items.some(item => location.pathname.startsWith(item.to))) {
                initial[group.id] = true;
            }
        });
        return initial;
    });

    // Auto-open group when route changes to an item within that group
    useEffect(() => {
        navGroups.forEach(group => {
            const hasActiveRoute = group.items.some(item => location.pathname.startsWith(item.to));
            if (hasActiveRoute) {
                setOpenGroups(prev => ({ ...prev, [group.id]: true }));
            }
        });
    }, [location.pathname]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const showCollapsedContent = isCollapsed && !isMobileOpen;

    // Filter permitted items within each group
    const visibleGroups = navGroups.map(group => ({
        ...group,
        items: group.items.filter(item => hasPermission(item.permission))
    })).filter(group => group.items.length > 0);

    return (
        <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white flex flex-col transition-transform duration-300 ease-in-out z-30 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            {/* Header / Brand */}
            <div className={`flex items-center justify-center py-6 px-4 border-b border-slate-700 flex-shrink-0 ${showCollapsedContent ? 'h-[65px]' : ''}`}>
                <h1 className={`font-bold text-white tracking-wider transition-all duration-300 ${showCollapsedContent ? 'text-lg' : 'text-2xl'}`}>
                    {showCollapsedContent ? 'C-OS' : 'Gold Towers Mitra Mandal'}
                </h1>
            </div>

            {/* Navigation Body */}
            <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {/* 1. Public Links (Home) */}
                {publicNavItems.map(item => (
                    <NavItem key={item.to} to={item.to} isCollapsed={showCollapsedContent} onClick={onMobileClose}>
                        {item.icon}
                        {!showCollapsedContent && <span className="ml-3 font-medium">{item.label}</span>}
                    </NavItem>
                ))}

                {/* 2. Top Standalone Links (Members for Donor/All, Dashboard for Managers/Admins) */}
                {standaloneNavItems.map(item => hasPermission(item.permission) && (
                    <NavItem key={item.to} to={item.to} isCollapsed={showCollapsedContent} onClick={onMobileClose}>
                        {item.icon}
                        {!showCollapsedContent && <span className="ml-3 font-medium">{item.label}</span>}
                    </NavItem>
                ))}

                {/* Divider if there are more operational groups visible */}
                {(visibleGroups.length > 0 || standaloneEndItems.some(i => hasPermission(i.permission))) && (
                    <div className="pt-2 pb-1">
                        <hr className="border-slate-700" />
                    </div>
                )}

                {/* 3. Grouped Navigation Modules (Events, Finance, Administration) */}
                {visibleGroups.map(group => {
                    const isOpen = !!openGroups[group.id];
                    const isGroupActive = group.items.some(item => location.pathname.startsWith(item.to));

                    if (showCollapsedContent) {
                        // Desktop Collapsed Icon View
                        return (
                            <div key={group.id} className="relative group/collapsed py-1">
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    title={group.label}
                                    className={`w-full flex items-center justify-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors ${
                                        isGroupActive ? 'bg-slate-700/80 text-blue-400 font-semibold' : ''
                                    }`}
                                >
                                    {group.icon}
                                </button>
                                {/* Flyout on hover for collapsed desktop */}
                                <div className="absolute left-full top-0 ml-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-2 px-1 hidden group-hover/collapsed:block z-50">
                                    <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                                        {group.label}
                                    </div>
                                    {group.items.map(subItem => (
                                        <NavLink
                                            key={subItem.to}
                                            to={subItem.to}
                                            end={subItem.to === '/festivals' || subItem.to === '/contributions'}
                                            onClick={onMobileClose}
                                            className={({ isActive }) =>
                                                `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                                    isActive ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                }`
                                            }
                                        >
                                            <span className="mr-2">{subItem.icon}</span>
                                            <span>{subItem.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    // Expanded (Desktop & Mobile) Accordion View
                    return (
                        <div key={group.id} className="space-y-1">
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-slate-300 hover:bg-slate-700/70 hover:text-white rounded-md transition-colors select-none ${
                                    isGroupActive ? 'text-white font-semibold' : ''
                                }`}
                                aria-expanded={isOpen}
                            >
                                <div className="flex items-center space-x-3">
                                    {group.icon}
                                    <span className="font-medium text-sm tracking-wide">{group.label}</span>
                                </div>
                                <ChevronRightIcon
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                        isOpen ? 'rotate-90 text-white' : ''
                                    }`}
                                />
                            </button>

                            {isOpen && (
                                <div className="space-y-1 pt-0.5 pb-1">
                                    {group.items.map(subItem => (
                                        <NavItem
                                            key={subItem.to}
                                            to={subItem.to}
                                            isCollapsed={false}
                                            isSubItem={true}
                                            onClick={onMobileClose}
                                        >
                                            <span className="mr-2.5">{subItem.icon}</span>
                                            <span>{subItem.label}</span>
                                        </NavItem>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* 4. Standalone Reports Link */}
                {standaloneEndItems.map(item => hasPermission(item.permission) && (
                    <NavItem key={item.to} to={item.to} isCollapsed={showCollapsedContent} onClick={onMobileClose}>
                        {item.icon}
                        {!showCollapsedContent && <span className="ml-3 font-medium">{item.label}</span>}
                    </NavItem>
                ))}
            </nav>

            {/* Sidebar Toggle (Desktop only) */}
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