import React from 'react';
import type { Vendor } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import FinanceNavigation from '../components/FinanceNavigation';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

const Vendors: React.FC = () => {
    const { vendors } = useData();
    const { openVendorModal, openConfirmationModal, openHistoryModal } = useModal();
    
    return (
        <div className="space-y-6">
            <FinanceNavigation />
            <div className="bg-white p-6 rounded-xl shadow-md">
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
                                            <button onClick={() => openHistoryModal('vendors', vendor.id, `History for ${vendor.name}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openVendorModal(vendor)} className="text-slate-600 hover:text-slate-900" title="Edit Vendor">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openConfirmationModal(vendor.id, 'vendors')} className="text-red-600 hover:text-red-900" title="Delete Vendor">
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
        </div>
    );
};

export default Vendors;
