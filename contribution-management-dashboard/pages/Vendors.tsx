import React from 'react';
import type { Vendor } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';

interface VendorsProps {
    vendors: Vendor[];
    onEdit: (vendor: Vendor) => void;
    onDelete: (id: string) => void;
}

const Vendors: React.FC<VendorsProps> = ({ vendors, onEdit, onDelete }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Our Vendors</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Persons</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {vendors.map(vendor => (
                            <tr key={vendor.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="text-sm font-medium text-slate-900">{vendor.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="text-sm text-slate-500">{vendor.business}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="text-sm text-slate-500">{vendor.address}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <ul className="space-y-1">
                                        {vendor.contacts.map((contact, index) => (
                                            <li key={index} className="text-sm">
                                                <span className="font-medium text-slate-800">{contact.name}</span>
                                                <span className="text-slate-500 ml-2">{contact.contactNumber}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-top text-sm font-medium">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => onEdit(vendor)} className="text-slate-600 hover:text-slate-900" title="Edit Vendor">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(vendor.id)} className="text-red-600 hover:text-red-900" title="Delete Vendor">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Vendors;
