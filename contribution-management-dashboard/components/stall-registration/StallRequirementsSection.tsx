import React from 'react';
import type { Festival as PublicFestival } from '../../types/index';
import { CloseIcon } from '../icons/CloseIcon';
import { formatUTCDate } from '../../utils/formatting';

interface StallRequirementsSectionProps {
    festival: PublicFestival | null;
    availableDates: string[];
    dateToAdd: string;
    setDateToAdd: (val: string) => void;
    selectedDates: string[];
    onAddDate: () => void;
    onRemoveDate: (date: string) => void;
    numberOfTables: number;
    setNumberOfTables: (val: number) => void;
    needsElectricity: boolean;
    setNeedsElectricity: (val: boolean) => void;
}

export const StallRequirementsSection: React.FC<StallRequirementsSectionProps> = ({
    festival,
    availableDates,
    dateToAdd,
    setDateToAdd,
    selectedDates,
    onAddDate,
    onRemoveDate,
    numberOfTables,
    setNumberOfTables,
    needsElectricity,
    setNeedsElectricity,
}) => {
    return (
        <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-700 mb-2">Stall Requirements</legend>
            <div>
                <label htmlFor="stallDate" className="block text-sm font-medium text-slate-700">Select Stall Dates *</label>
                <div className="flex items-center gap-2 mt-1">
                    <select id="stallDate" value={dateToAdd} onChange={e => setDateToAdd(e.target.value)} className="block w-full input-style bg-white">
                        <option value="" disabled>Choose a date...</option>
                        {availableDates.map(date => {
                            const totalBooked = festival?.stallDateCounts?.[date] || 0;
                            const approvedBooked = festival?.approvedStallCounts?.[date] || 0;
                            const isFull = festival?.maxStalls ? approvedBooked >= festival.maxStalls : false;
                            const label = `${formatUTCDate(date)} ${festival?.maxStalls ? `(${totalBooked} / ${festival.maxStalls} booked)` : `(${totalBooked} booked)`}${isFull ? ' - Fully Booked' : ''}`;
                            return <option key={date} value={date} disabled={isFull}>{label}</option>;
                        })}
                    </select>
                    <button type="button" onClick={onAddDate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold" disabled={!dateToAdd}>Add</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 empty:mt-0">
                    {selectedDates.map(date => (
                        <span key={date} className="flex items-center bg-slate-200 text-slate-800 text-sm font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                            {formatUTCDate(date)}
                            <button type="button" onClick={() => onRemoveDate(date)} className="ml-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-300">
                                <CloseIcon className="w-3.5 h-3.5"/>
                            </button>
                        </span>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <label htmlFor="numberOfTables" className="block text-sm font-medium text-slate-700">Number of Tables *</label>
                    <input type="number" id="numberOfTables" value={numberOfTables} onChange={e => setNumberOfTables(Math.max(1, parseInt(e.target.value) || 1))} required min="1" className="mt-1 block w-full input-style" />
                </div>
                <label className="flex items-center space-x-2 md:mt-6">
                    <input type="checkbox" checked={needsElectricity} onChange={e => setNeedsElectricity(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm font-medium text-slate-700">Need Electrical Connection?</span>
                </label>
            </div>
        </fieldset>
    );
};
