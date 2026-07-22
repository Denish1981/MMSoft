import React from 'react';
import { Link } from 'react-router-dom';
import { HelpIcon } from '../icons/HelpIcon';
import { CampaignIcon } from '../icons/CampaignIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { ContributionIcon } from '../icons/DonateIcon';
import { ReceiptIcon } from '../icons/ReceiptIcon';
import { CheckSquareIcon } from '../icons/CheckSquareIcon';

export type DocSection = 'overview' | 'campaigns' | 'festivals_events' | 'contributions_sponsors' | 'expenses_vendors' | 'tasks_volunteers';

export interface DocSidebarSection {
    id: DocSection;
    title: string;
    icon: React.ReactNode;
}

interface DocSidebarProps {
    activeSection: DocSection;
    onSelectSection: (section: DocSection) => void;
}

export const sections: DocSidebarSection[] = [
    { id: 'overview', title: 'System Overview', icon: <HelpIcon className="w-5 h-5" /> },
    { id: 'campaigns', title: 'Campaigns & Budgets', icon: <CampaignIcon className="w-5 h-5" /> },
    { id: 'festivals_events', title: 'Festivals & Events', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'contributions_sponsors', title: 'Contributions & Sponsors', icon: <ContributionIcon className="w-5 h-5" /> },
    { id: 'expenses_vendors', title: 'Expenses & Vendors', icon: <ReceiptIcon className="w-5 h-5" /> },
    { id: 'tasks_volunteers', title: 'Tasks & Volunteers', icon: <CheckSquareIcon className="w-5 h-5" /> },
];

export const DocSidebar: React.FC<DocSidebarProps> = ({ activeSection, onSelectSection }) => {
    return (
        <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sticky top-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Documentation Menu</h3>
                <div className="space-y-1">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => onSelectSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                activeSection === section.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {section.icon}
                            <span>{section.title}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 pt-4 border-t border-slate-200 px-2">
                    <Link to="/dashboard" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5">
                        ← Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};
