
import React from 'react';

export const TextInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Filter by ${label}...`}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
    </div>
);

export const AmountInput: React.FC<{
    label: string;
    comparator: string;
    onComparatorChange: (val: string) => void;
    value: string;
    onValueChange: (val: string) => void;
}> = ({ label, comparator, onComparatorChange, value, onValueChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <div className="flex items-center">
            <select
                value={comparator}
                onChange={(e) => onComparatorChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50"
            >
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="==">==</option>
            </select>
            <input
                type="number"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder="Amount"
                className="w-full px-3 py-2 border-t border-b border-r border-slate-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
        </div>
    </div>
);

export const DateInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
    </div>
);

export const SelectInput: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
}> = ({ label, value, onChange, options, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export const FilterContainer: React.FC<{ onReset: () => void; children: React.ReactNode }> = ({ onReset, children }) => (
    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {children}
        </div>
        <div className="mt-4 flex justify-end">
            <button
                onClick={onReset}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition text-sm font-medium"
            >
                Reset Filters
            </button>
        </div>
    </div>
);
