import React from 'react';
import { ContributionIcon } from '../icons/DonateIcon';
import { DocStepItem } from './DocStepItem';

export const ContributionsSponsorsSection: React.FC = () => {
    return (
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
                    <DocStepItem num={1} title="Go to Contributions list" desc='Click "Contributions" in the sidebar.' />
                    <DocStepItem num={2} title="Initiate creation" desc='Click the "Add Contribution" button in the page header.' />
                    <DocStepItem num={3} title="Fill Donor Details" desc="Input Donor name, Phone number, Email, Tower and Flat details. Specify the Amount, Payment Method (Cash, Online, Cheque), and Coupons issued (if applicable)." />
                    <DocStepItem num={4} title="Select target Campaign" desc="Choose which active Campaign this donation should credit." />
                    <DocStepItem num={5} title="Save" desc="Click Save. The transaction immediately adds to Campaign totals on your dashboard." />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Performing Bulk Contributions Import</h3>
                <p className="text-slate-650 text-sm mb-2">Import massive logs in a batch instead of entering them individually.</p>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Go to Contributions" desc='Navigate to "Contributions" in your sidebar.' />
                    <DocStepItem num={2} title='Click "Bulk Add"' desc='Click the black "Bulk Add" button on the top right.' />
                    <DocStepItem num={3} title="Paste Spreadsheet Rows" desc="Paste data from an Excel/CSV spreadsheet directly into our formatted matrix, or fill out the inline cells with Donor name, Tower, Flat, Amount, Payment Type, and target Campaign." />
                    <DocStepItem num={4} title="Validate and Submit" desc='Review entries for errors, and click "Submit Batch" to write them all instantly.' />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Adding Sponsors</h3>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Sponsor Panel" desc="Navigate to Sponsors list page." />
                    <DocStepItem num={2} title="Submit Sponsor Pledge" desc='Click "Add Sponsor". Enter Company Name, contact details, sponsorship Tier (Gold, Silver, Platinum), agreed Pledged Amount, payment status, and associate to the corresponding Campaign.' />
                </div>
            </div>
        </div>
    );
};
