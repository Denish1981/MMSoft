import React from 'react';
import { HelpIcon } from '../icons/HelpIcon';

export const OverviewSection: React.FC = () => {
    return (
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
    );
};
