import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpIcon } from '../components/icons/HelpIcon';
import { CampaignIcon } from '../components/icons/CampaignIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { ContributionIcon } from '../components/icons/DonateIcon';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { StoreIcon } from '../components/icons/StoreIcon';
import { UsersIcon } from '../components/icons/UsersIcon';

type DocSection = 'overview' | 'campaigns' | 'festivals_events' | 'contributions_sponsors' | 'expenses_vendors' | 'tasks_volunteers';

const Documentation: React.FC = () => {
    const [activeSection, setActiveSection] = useState<DocSection>('overview');

    const sections = [
        { id: 'overview' as DocSection, title: 'System Overview', icon: <HelpIcon className="w-5 h-5" /> },
        { id: 'campaigns' as DocSection, title: 'Campaigns & Budgets', icon: <CampaignIcon className="w-5 h-5" /> },
        { id: 'festivals_events' as DocSection, title: 'Festivals & Events', icon: <CalendarIcon className="w-5 h-5" /> },
        { id: 'contributions_sponsors' as DocSection, title: 'Contributions & Sponsors', icon: <ContributionIcon className="w-5 h-5" /> },
        { id: 'expenses_vendors' as DocSection, title: 'Expenses & Vendors', icon: <ReceiptIcon className="w-5 h-5" /> },
        { id: 'tasks_volunteers' as DocSection, title: 'Tasks & Volunteers', icon: <CheckSquareIcon className="w-5 h-5" /> },
    ];

    const renderStep = (num: number, title: string, desc: string | React.ReactNode) => (
        <div key={num} className="flex gap-4 items-start py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
                {num}
            </div>
            <div>
                <h4 className="font-semibold text-slate-800 text-base">{title}</h4>
                <div className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{desc}</div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            {/* Navigation Drawer / Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sticky top-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Documentation Menu</h3>
                    <div className="space-y-1">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
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

            {/* Main Documentation Viewer Panel */}
            <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl">
                {/* Content pages */}
                {activeSection === 'overview' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800">Welcome to Contribution OS</h2>
                            <p className="text-slate-500 mt-1">A unified financial management, volunteer operations, and public interaction portal.</p>
                        </div>

                        <div className="prose prose-slate max-w-none space-y-4">
                            <p className="text-slate-650 leading-relaxed">
                                <strong>Contribution OS</strong> is an offline-first, highly responsive platform tailored for non-profits, associations, and community groups. It is designed to manage capital campaigns, major festivals, operations, expenses, volunteer tasks, and public facing features (such as event registrations, photo albums, and public stall bookings).
                            </p>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                    <HelpIcon className="w-5 h-5 text-blue-600" />
                                    Key Architectural Highlights
                                </h3>
                                <ul className="list-disc list-inside mt-3 space-y-2 text-sm text-slate-600">
                                    <li><strong>Unified Balance Engine</strong>: Ensures that every contribution, sponsor payout, and vendor expense is linked back to campaigns and festivals to prevent budgetary overflow.</li>
                                    <li><strong>Granular Permissions</strong>: User profiles are protected via strict Role-Based Access Controls (RBAC) ensuring appropriate visibility of logs, finance details, and management dashboards.</li>
                                    <li><strong>Audit Logs / History</strong>: Maintains exact logs on records including creation timestamps, editor profiles, and exact value histories.</li>
                                </ul>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4">General Platform Rules</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <h4 className="font-semibold text-blue-800 text-sm uppercase tracking-wide">Data Linking Flow</h4>
                                    <p className="text-xs text-slate-600 mt-1.5">Every system element flows hierarchically. You create a <strong>Campaign</strong> first, assign multiple <strong>Festivals</strong> to it, manage <strong>Events</strong> inside each Festival, specify <strong>Budgets</strong> and record exact <strong>Expenses</strong> against specific Festivals.</p>
                                </div>
                                <div className="p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <h4 className="font-semibold text-emerald-800 text-sm uppercase tracking-wide">Dynamic Aggregations</h4>
                                    <p className="text-xs text-slate-600 mt-1.5">The dashboard calculations and outstanding payment widgets instantly recompute based on your active campaign filter, allowing seamless switching across different financial periods and groups.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'campaigns' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <CampaignIcon className="w-7 h-7 text-blue-600" />
                                Campaigns & Budgets
                            </h2>
                            <p className="text-slate-500 mt-1">Setup multi-year financial campaigns, target goals, and allocate modular budgets.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-850">
                                <strong>What is a Campaign?</strong> A Campaign is your major overarching financial period or target initiative (e.g. "Annual Festival 2026", "Temple Renovation"). All contributions and events occur under a parent campaign.
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-2 border-b pb-1">Creating a New Campaign</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Navigate to Campaigns List', 'Click on "Campaigns" in the sidebar navigation menu.')}
                                {renderStep(2, 'Click "Add Campaign"', 'Locate and click the "Add Campaign" button on the top right header panel.')}
                                {renderStep(3, 'Specify details', 'Enter the Campaign Name, financial Year (e.g., "2026-2027"), specific target Goal Amount, and description.')}
                                {renderStep(4, 'Carry / Brought Forward Balance (Optional)', 'During campaign creation, you can select an existing "Brought Forward From" campaign. The system automatically computes the remaining surplus/deficit (i.e. Income minus Expenses) of the selected campaign and inputs it as a starting credit entry in the contributions log of the new campaign.')}
                                {renderStep(5, 'Save Campaign', 'Click "Submit" / "Save". The campaign will active immediately alongside your filters.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Allocating Budget Items</h3>
                            <p className="text-slate-600 text-sm mb-2">Budgets let you pre-authorize exact dollar amounts for specific categories (Expense Heads) within different festivals.</p>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Open Budgets page', 'Go to "Reports" or select "Budget" from your operations panel.')}
                                {renderStep(2, 'Allocate Budget Item', 'Click "Add Budget Item" in the header.')}
                                {renderStep(3, 'Link and Category', 'Choose the target Festival, select the Expense Head (e.g., Catering, Decoration, Sound System), specify the Authorized Budget Amount, and save.')}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'festivals_events' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <CalendarIcon className="w-7 h-7 text-blue-600" />
                                Festivals & Events
                            </h2>
                            <p className="text-slate-500 mt-1">Configure community festivals, design sub-events, and review attendee ticket registrations.</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-1">1. Creating a New Festival</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Navigate to Festivals', 'Click on "Festivals" in the sidebar menu.')}
                                {renderStep(2, 'Initiate creation', 'Click the "Add Festival" button in the top right corner of the Header.')}
                                {renderStep(3, 'Form entries', 'Fill in: \n• Festival name\n• Linked Campaign (select from dropdown)\n• Start Date and End Date\n• Festival descriptions and notes')}
                                {renderStep(4, 'Save', 'Click the save button. The festival will be stored and become visible in your list.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">2. Adding Events to a Festival</h3>
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-xs font-semibold mb-2">
                                Note: Events must be linked to a parent Festival. Be sure to follow these exact steps to open the event-creation frame.
                            </div>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Locate parent Festival', 'Navigate to the "Festivals" page.')}
                                {renderStep(2, 'Click "Manage Events" Icon', (
                                    <span>
                                        In the festivals list table, find your desired festival. Now under the <strong>Actions</strong> column, click the <CalendarDaysIcon className="w-4 h-4 inline mx-1 text-blue-600" /> icon (Calendar Days) associated with that festival.
                                    </span>
                                ))}
                                {renderStep(3, 'Add Event', 'On the Festival Events page that loads, click the "Add Event" button appearing in the header.')}
                                {renderStep(4, 'Enter Event details', 'Input Name, Event Date, Start & End times, Venue, Description / Ticket Price (if applicable), and description.')}
                                {renderStep(5, 'Save Event', 'Save details. The sub-event is instantly linked and displayed in the event calendar.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">3. Managing Public Stall Registrations</h3>
                            <p className="text-slate-600 text-sm">Festivals can offer public stall rentals. Users register via a public page, and admins review them.</p>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Click "Manage Stalls"', (
                                    <span>
                                        Go to <strong>Festivals</strong> page, locate your festival and click on the <StoreIcon className="w-4 h-4 inline mx-1 text-green-600" /> icon (Store/Shop Icon) to view and approve stall applications.
                                    </span>
                                ))}
                                {renderStep(2, 'Review applications', 'Confirm payment details, authorize placement spot, or mark registrations as Completed/Pending.')}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'contributions_sponsors' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <ContributionIcon className="w-7 h-7 text-blue-600" />
                                Contributions & Sponsors
                            </h2>
                            <p className="text-slate-500 mt-1">Manage single donations, bulk uploads, sponsor pledges, and coupon distribution.</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-1">Adding a Single Contribution</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Go to Contributions list', 'Click "Contributions" in the sidebar.')}
                                {renderStep(2, 'Initiate creation', 'Click the "Add Contribution" button in the page header.')}
                                {renderStep(3, 'Fill Donor Details', 'Input Donor name, Phone number, Email, Tower and Flat details. Specify the Amount, Payment Method (Cash, Online, Cheque), and Coupons issued (if applicable).')}
                                {renderStep(4, 'Select target Campaign', 'Choose which active Campaign this donation should credit.')}
                                {renderStep(5, 'Save', 'Click Save. The transaction immediately adds to Campaign totals on your dashboard.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Performing Bulk Contributions Import</h3>
                            <p className="text-slate-650 text-sm mb-2">Import massive logs in a batch instead of entering them individually.</p>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Go to Contributions', 'Navigate to "Contributions" in your sidebar.')}
                                {renderStep(2, 'Click "Bulk Add"', 'Click the black "Bulk Add" button on the top right.')}
                                {renderStep(3, 'Paste Spreadsheet Rows', 'Paste data from an Excel/CSV spreadsheet directly into our formatted matrix, or fill out the inline cells with Donor name, Tower, Flat, Amount, Payment Type, and target Campaign.')}
                                {renderStep(4, 'Validate and Submit', 'Review entries for errors, and click "Submit Batch" to write them all instantly.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Adding Sponsors</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Sponsor Panel', 'Navigate to Sponsors list page.')}
                                {renderStep(2, 'Submit Sponsor Pledge', 'Click "Add Sponsor". Enter Company Name, contact details, sponsorship Tier (Gold, Silver, Platinum), agreed Pledged Amount, payment status, and associate to the corresponding Campaign.')}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'expenses_vendors' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <ReceiptIcon className="w-7 h-7 text-blue-600" />
                                Expenses, Quotations & Vendors
                            </h2>
                            <p className="text-slate-500 mt-1">Procure vendor quotes, check category budgets, track real costs, and examine outstanding bills.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-900 text-xs font-semibold leading-relaxed">
                                Tip: Keep vendor payment clean by filling the "Outstanding Amount" field. If an expense is logged and has remaining unpaid balances, the system holds it in the "Outstanding Payments" alert console on the Dashboard automatically!
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b pb-1">Logging an Expense</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Go to Expenses', 'Click "Expenses" in the sidebar menu.')}
                                {renderStep(2, 'Click "Add Expense"', 'Locate the button in the top header.')}
                                {renderStep(3, 'Details and Category', 'Enter Expense Title, category (Expense Head), total cost, and select the linked Vendor.')}
                                {renderStep(4, 'Festival correlation', 'Link the expense containing the budget line to the respective Festival.')}
                                {renderStep(5, 'Pay status & Outstanding amount', 'Enter the Amount Paid and any Outstanding Amount. Select the Payment Status (e.g., Pending, Partial, Completed) and click save.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Managing Quotations</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Navigate to Quotations', 'Navigate to "Expenses" -> then click "Quotations" view.')}
                                {renderStep(2, 'Create Proposal Quote', 'Click "Add Quotation". Select the target Vendor, enter estimated bidding cost, description of the service, and link it to the festival. This helps comparing costs during procurement.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Adding Vendors</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Go to Vendor screen', 'Click "Vendors" page.')}
                                {renderStep(2, 'Register Vendor', 'Click "Add Vendor". Specify business Name, services provided, physical Address, email, phone number, and outstanding credit account records.')}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'tasks_volunteers' && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <CheckSquareIcon className="w-7 h-7 text-blue-600" />
                                Tasks & Volunteer Operations
                            </h2>
                            <p className="text-slate-500 mt-1">Assign volunteer tasks, delegate responsibilities, track deadlines, and monitor completion states.</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-1">Creating and Assigning a Task</h3>
                            <div className="divide-y divide-slate-100">
                                {renderStep(1, 'Go to Tasks', 'Click "Tasks" in the sidebar menu.')}
                                {renderStep(2, 'Click "Add Task"', 'Click the main blue action button on the top right.')}
                                {renderStep(3, 'Form input', 'Fill in task details: \n• Title (e.g. "Draft Catering Contract")\n• Linked Festival (e.g. "Summer Gala")\n• Volunteer / Admin assigned\n• Due Date \n• Priority (Low, Medium, High)\n• Status (Pending, In Progress, Completed)')}
                                {renderStep(4, 'Save', 'Submit the form to add the task. The system automatically alerts assigned volunteers when they access their task hub.')}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1 font-semibold">Track Unique Participants</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                The system collects a master list of all <strong>Unique Participants</strong> across all registrations, public stalls, and event signups automatically. 
                                Go to the <strong>Participants</strong> tab to search any local resident via name or phone number, see all their previous contributions, view festivals they registered for, and click individual history logs.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Documentation;
