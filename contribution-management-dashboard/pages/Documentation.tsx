import React, { useState } from 'react';
import { DocSidebar, type DocSection } from '../components/documentation/DocSidebar';
import { OverviewSection } from '../components/documentation/OverviewSection';
import { CampaignsSection } from '../components/documentation/CampaignsSection';
import { FestivalsEventsSection } from '../components/documentation/FestivalsEventsSection';
import { ContributionsSponsorsSection } from '../components/documentation/ContributionsSponsorsSection';
import { ExpensesVendorsSection } from '../components/documentation/ExpensesVendorsSection';
import { TasksVolunteersSection } from '../components/documentation/TasksVolunteersSection';

const Documentation: React.FC = () => {
    const [activeSection, setActiveSection] = useState<DocSection>('overview');

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            {/* Navigation Drawer / Sidebar */}
            <DocSidebar activeSection={activeSection} onSelectSection={setActiveSection} />

            {/* Main Documentation Viewer Panel */}
            <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl">
                {activeSection === 'overview' && <OverviewSection />}
                {activeSection === 'campaigns' && <CampaignsSection />}
                {activeSection === 'festivals_events' && <FestivalsEventsSection />}
                {activeSection === 'contributions_sponsors' && <ContributionsSponsorsSection />}
                {activeSection === 'expenses_vendors' && <ExpensesVendorsSection />}
                {activeSection === 'tasks_volunteers' && <TasksVolunteersSection />}
            </div>
        </div>
    );
};

export default Documentation;
