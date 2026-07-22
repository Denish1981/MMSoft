import React from 'react';
import type { EventContactPerson } from '../../types/index';
import { PlusIcon } from '../icons/PlusIcon';
import { CloseIcon } from '../icons/CloseIcon';

interface EventContactPersonsSectionProps {
    contactPersons: EventContactPerson[];
    onContactChange: (index: number, field: keyof EventContactPerson, value: string) => void;
    onAddContactField: () => void;
    onRemoveContactField: (index: number) => void;
}

export const EventContactPersonsSection: React.FC<EventContactPersonsSectionProps> = ({
    contactPersons,
    onContactChange,
    onAddContactField,
    onRemoveContactField,
}) => {
    return (
        <div className="space-y-4 pt-4 mt-4 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-800">Contact Persons</h3>
            {contactPersons.map((contact, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative">
                    {contactPersons.length > 1 && (
                        <button type="button" onClick={() => onRemoveContactField(index)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`contactName-${index}`} className="block text-sm font-medium text-slate-600">Contact Name</label>
                            <input type="text" id={`contactName-${index}`} value={contact.name} onChange={e => onContactChange(index, 'name', e.target.value)} className="mt-1 block w-full input-style" />
                        </div>
                        <div>
                            <label htmlFor={`contactNumber-${index}`} className="block text-sm font-medium text-slate-600">Contact Number</label>
                            <input type="tel" id={`contactNumber-${index}`} value={contact.contactNumber} onChange={e => onContactChange(index, 'contactNumber', e.target.value)} className="mt-1 block w-full input-style" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor={`contactEmail-${index}`} className="block text-sm font-medium text-slate-600">Email (Optional)</label>
                        <input type="email" id={`contactEmail-${index}`} value={contact.email || ''} onChange={e => onContactChange(index, 'email', e.target.value)} className="mt-1 block w-full input-style" />
                    </div>
                </div>
            ))}
            <button type="button" onClick={onAddContactField} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                <PlusIcon className="w-4 h-4 mr-1"/> Add another contact
            </button>
        </div>
    );
};
