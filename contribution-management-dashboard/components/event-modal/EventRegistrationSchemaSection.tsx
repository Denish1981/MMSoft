import React from 'react';
import type { RegistrationFormField } from '../../types/index';
import { PlusIcon } from '../icons/PlusIcon';
import { DeleteIcon } from '../icons/DeleteIcon';

interface EventRegistrationSchemaSectionProps {
    formSchema: RegistrationFormField[];
    onSchemaChange: (index: number, field: keyof RegistrationFormField, value: any) => void;
    onAddSchemaField: () => void;
    onRemoveSchemaField: (index: number) => void;
}

export const EventRegistrationSchemaSection: React.FC<EventRegistrationSchemaSectionProps> = ({
    formSchema,
    onSchemaChange,
    onAddSchemaField,
    onRemoveSchemaField,
}) => {
    return (
        <div className="pt-4 mt-4 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Custom Registration Form</h3>
            <div className="space-y-4">
                {formSchema.map((field, index) => {
                    const isDefault = index < 4;
                    return (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 relative">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Field Label</label>
                                    <input type="text" value={field.label} onChange={e => onSchemaChange(index, 'label', e.target.value)} className="mt-1 block w-full input-style text-sm" disabled={isDefault} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Field Type</label>
                                    <select value={field.type} onChange={e => onSchemaChange(index, 'type', e.target.value)} className="mt-1 block w-full input-style text-sm bg-white" disabled={isDefault}>
                                        <option value="text">Text</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="textarea">Text Area</option>
                                        <option value="select">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center space-x-2">
                                        <input type="checkbox" checked={field.required} onChange={e => onSchemaChange(index, 'required', e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded" disabled={isDefault} />
                                        <span className="text-sm font-medium text-slate-700">Required</span>
                                    </label>
                                </div>
                            </div>
                            {field.type === 'select' && (
                                <div className="mt-4">
                                    <label className="block text-xs font-medium text-slate-600">Dropdown Options</label>
                                    <input type="text" value={field.options} onChange={e => onSchemaChange(index, 'options', e.target.value)} placeholder="e.g., Small, Medium, Large" className="mt-1 block w-full input-style text-sm" />
                                    <p className="text-xs text-slate-500 mt-1">Enter comma-separated values.</p>
                                </div>
                            )}
                            {!isDefault && (
                                <button type="button" onClick={() => onRemoveSchemaField(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><DeleteIcon className="w-5 h-5" /></button>
                            )}
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={onAddSchemaField} className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                <PlusIcon className="w-4 h-4 mr-1"/> Add Custom Field
            </button>
        </div>
    );
};
