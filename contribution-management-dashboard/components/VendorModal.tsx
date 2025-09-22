import React, { useState, useEffect } from 'react';
import type { Vendor, ContactPerson } from '../types/index';
import { CloseIcon } from './icons/CloseIcon';
import { PlusIcon } from './icons/PlusIcon';

interface VendorModalProps {
    vendorToEdit: Vendor | null;
    onClose: () => void;
    onSubmit: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const VendorModal: React.FC<VendorModalProps> = ({ vendorToEdit, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [business, setBusiness] = useState('');
    const [address, setAddress] = useState('');
    const [contacts, setContacts] = useState<ContactPerson[]>([{ name: '', contactNumber: '' }]);

    useEffect(() => {
        if (vendorToEdit) {
            setName(vendorToEdit.name);
            setBusiness(vendorToEdit.business);
            setAddress(vendorToEdit.address);
            setContacts(vendorToEdit.contacts.length > 0 ? vendorToEdit.contacts : [{ name: '', contactNumber: '' }]);
        }
    }, [vendorToEdit]);

    const handleContactChange = (index: number, field: keyof ContactPerson, value: string) => {
        const newContacts = [...contacts];
        newContacts[index][field] = value;
        setContacts(newContacts);
    };

    const addContactField = () => {
        setContacts([...contacts, { name: '', contactNumber: '' }]);
    };

    const removeContactField = (index: number) => {
        const newContacts = contacts.filter((_, i) => i !== index);
        setContacts(newContacts);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !business || !address || contacts.some(c => !c.name || !c.contactNumber)) {
            alert('Please fill out all required fields, including all contact person details.');
            return;
        }
        onSubmit({
            name,
            business,
            address,
            contacts,
        });
    };
    
    const isEditing = !!vendorToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="vendorName" className="block text-sm font-medium text-slate-700">Vendor Name</label>
                        <input type="text" id="vendorName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                     <div>
                        <label htmlFor="vendorBusiness" className="block text-sm font-medium text-slate-700">Vendor Business</label>
                        <input type="text" id="vendorBusiness" value={business} onChange={e => setBusiness(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                     <div>
                        <label htmlFor="vendorAddress" className="block text-sm font-medium text-slate-700">Address / Location</label>
                        <input type="text" id="vendorAddress" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>

                    <div className="space-y-4 pt-2">
                        <h3 className="text-lg font-medium text-slate-800">Contact Persons</h3>
                        {contacts.map((contact, index) => (
                            <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={`contactName-${index}`} className="block text-sm font-medium text-slate-600">Contact Name</label>
                                        <input type="text" id={`contactName-${index}`} value={contact.name} onChange={e => handleContactChange(index, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                                    </div>
                                     <div>
                                        <label htmlFor={`contactNumber-${index}`} className="block text-sm font-medium text-slate-600">Contact Number</label>
                                        <input type="tel" id={`contactNumber-${index}`} value={contact.contactNumber} onChange={e => handleContactChange(index, 'contactNumber', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                                    </div>
                                </div>
                                {contacts.length > 1 && (
                                    <button type="button" onClick={() => removeContactField(index)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addContactField} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                            <PlusIcon className="w-4 h-4 mr-1"/>
                            Add another contact
                        </button>
                    </div>

                    <div className="flex justify-end pt-4 space-x-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Vendor' : 'Add Vendor'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
