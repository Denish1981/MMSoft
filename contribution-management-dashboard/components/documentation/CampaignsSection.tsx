import React from 'react';
import { CampaignIcon } from '../icons/CampaignIcon';
import { DocStepItem } from './DocStepItem';

export const CampaignsSection: React.FC = () => {
    return (
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
                    <DocStepItem num={1} title="Navigate to Campaigns List" desc='Click on "Campaigns" in the sidebar navigation menu.' />
                    <DocStepItem num={2} title='Click "Add Campaign"' desc='Locate and click the "Add Campaign" button on the top right header panel.' />
                    <DocStepItem num={3} title="Specify details" desc='Enter the Campaign Name, financial Year (e.g., "2026-2027"), specific target Goal Amount, and description.' />
                    <DocStepItem num={4} title="Carry / Brought Forward Balance (Optional)" desc='During campaign creation, you can select an existing "Brought Forward From" campaign. The system automatically computes the remaining surplus/deficit (i.e. Income minus Expenses) of the selected campaign and inputs it as a starting credit entry in the contributions log of the new campaign.' />
                    <DocStepItem num={5} title="Save Campaign" desc='Click "Submit" / "Save". The campaign will active immediately alongside your filters.' />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Allocating Budget Items</h3>
                <p className="text-slate-600 text-sm mb-2">Budgets let you pre-authorize exact dollar amounts for specific categories (Expense Heads) within different festivals.</p>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Open Budgets page" desc='Go to "Reports" or select "Budget" from your operations panel.' />
                    <DocStepItem num={2} title="Allocate Budget Item" desc='Click "Add Budget Item" in the header.' />
                    <DocStepItem num={3} title="Link and Category" desc="Choose the target Festival, select the Expense Head (e.g., Catering, Decoration, Sound System), specify the Authorized Budget Amount, and save." />
                </div>
            </div>
        </div>
    );
};
