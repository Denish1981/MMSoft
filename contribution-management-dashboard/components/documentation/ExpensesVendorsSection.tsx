import React from 'react';
import { ReceiptIcon } from '../icons/ReceiptIcon';
import { DocStepItem } from './DocStepItem';

export const ExpensesVendorsSection: React.FC = () => {
    return (
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
                    <DocStepItem num={1} title="Go to Expenses" desc='Click "Expenses" in the sidebar menu.' />
                    <DocStepItem num={2} title='Click "Add Expense"' desc="Locate the button in the top header." />
                    <DocStepItem num={3} title="Details and Category" desc="Enter Expense Title, category (Expense Head), total cost, and select the linked Vendor." />
                    <DocStepItem num={4} title="Festival correlation" desc="Link the expense containing the budget line to the respective Festival." />
                    <DocStepItem num={5} title="Pay status & Outstanding amount" desc="Enter the Amount Paid and any Outstanding Amount. Select the Payment Status (e.g., Pending, Partial, Completed) and click save." />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Managing Quotations</h3>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Navigate to Quotations" desc='Navigate to "Expenses" -> then click "Quotations" view.' />
                    <DocStepItem num={2} title="Create Proposal Quote" desc='Click "Add Quotation". Select the target Vendor, enter estimated bidding cost, description of the service, and link it to the festival. This helps comparing costs during procurement.' />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">Adding Vendors</h3>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Go to Vendor screen" desc='Click "Vendors" page.' />
                    <DocStepItem num={2} title="Register Vendor" desc='Click "Add Vendor". Specify business Name, services provided, physical Address, email, phone number, and outstanding credit account records.' />
                </div>
            </div>
        </div>
    );
};
