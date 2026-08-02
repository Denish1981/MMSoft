import React from 'react';
import { ContributionStatus, type Festival } from '../../types/index';

interface ContributionFieldsProps {
    amount: string;
    setAmount: (val: string) => void;
    date: string;
    setDate: (val: string) => void;
    numberOfCoupons: string;
    setNumberOfCoupons: (val: string) => void;
    selectedDropdownType: string;
    setSelectedDropdownType: (val: string) => void;
    customType: string;
    setCustomType: (val: string) => void;
    status: ContributionStatus;
    setStatus: (val: ContributionStatus) => void;
    festivalId: number | null;
    setFestivalId: (val: number | null) => void;
    festivals: Festival[];
}

export const ContributionFields: React.FC<ContributionFieldsProps> = ({
    amount,
    setAmount,
    date,
    setDate,
    numberOfCoupons,
    setNumberOfCoupons,
    selectedDropdownType,
    setSelectedDropdownType,
    customType,
    setCustomType,
    status,
    setStatus,
    festivalId,
    setFestivalId,
    festivals,
}) => {
    const isMisc = selectedDropdownType === 'Miscellaneous';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700">Amount (₹)</label>
                    <input 
                        type="number" 
                        id="amount" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        required 
                        min="1" 
                    />
                </div>
                <div>
                    <label htmlFor="contributionDate" className="block text-sm font-medium text-slate-700">Date</label>
                    <input 
                        type="date" 
                        id="contributionDate" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        required 
                    />
                </div>
            </div>

            <div className={`grid ${isMisc ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'} gap-4`}>
                {!isMisc && (
                    <div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="numberOfCoupons" className="block text-sm font-medium text-slate-700">No of Coupons</label>
                            <span className="text-[11px] text-slate-500 font-normal">(Max 4)</span>
                        </div>
                        <input 
                            type="number" 
                            id="numberOfCoupons" 
                            value={numberOfCoupons} 
                            onChange={e => {
                                const val = e.target.value;
                                if (val !== '' && parseInt(val, 10) > 4) {
                                    setNumberOfCoupons('4');
                                    alert('Maximum 4 coupons are allowed per contribution. Please contact GTMM if you need more than 4 coupons.');
                                } else {
                                    setNumberOfCoupons(val);
                                }
                            }} 
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                            required 
                            min="0"
                            max="4"
                        />
                        {numberOfCoupons && parseInt(numberOfCoupons, 10) >= 4 && (
                            <p className="mt-1 text-xs text-amber-700 font-medium">
                                Maximum limit is 4 coupons. Please contact GTMM if you need more than 4 coupons.
                            </p>
                        )}
                    </div>
                )}
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700">Type</label>
                    <select 
                        id="type" 
                        value={selectedDropdownType} 
                        onChange={e => setSelectedDropdownType(e.target.value)} 
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        required
                    >
                        <option value="Online">Online</option>
                        <option value="Cash">Cash</option>
                        <option value="Donation Box">Donation Box</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                        <option value="Other">Other...</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                    <select 
                        id="status" 
                        value={status} 
                        onChange={e => setStatus(e.target.value as ContributionStatus)} 
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        required
                    >
                        {Object.values(ContributionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {(selectedDropdownType === 'Other' || selectedDropdownType === 'Miscellaneous') && (
                <div>
                    <label htmlFor="customType" className="block text-sm font-medium text-slate-700">
                        {selectedDropdownType === 'Miscellaneous' ? 'Specify Custom Income Type (Optional)' : 'Specify Custom Income Type'}
                    </label>
                    <input 
                        type="text" 
                        id="customType" 
                        value={customType} 
                        onChange={e => setCustomType(e.target.value)} 
                        placeholder={selectedDropdownType === 'Miscellaneous' ? "e.g., Stall Fee, Interest, Advertisement" : "e.g. Sponsorship, Sale of coupons, Tea Stall"} 
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        required={selectedDropdownType === 'Other'} 
                    />
                </div>
            )}

            <div>
                <label htmlFor="festival" className="block text-sm font-medium text-slate-700">Festival</label>
                <select 
                    id="festival" 
                    value={festivalId || ''} 
                    onChange={e => setFestivalId(e.target.value ? Number(e.target.value) : null)} 
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    required
                >
                    <option value="" disabled>Select a festival</option>
                    {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>
        </div>
    );
};
