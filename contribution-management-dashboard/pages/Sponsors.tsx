
import React from 'react';
import type { Sponsor } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { formatCurrency } from '../utils/formatting';

interface SponsorsProps {
    sponsors: Sponsor[];
    onEdit: (sponsor: Sponsor) => void;
    onDelete: (id: string) => void;
}

const Sponsors: React.FC<SponsorsProps> = ({ sponsors, onEdit, onDelete }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Our Sponsors</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sponsor Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business Info</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {sponsors.map(sponsor => (
                            <tr key={sponsor.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{sponsor.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sponsor.businessCategory}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(sponsor.sponsorshipAmount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sponsor.sponsorshipType}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-900">{sponsor.contactNumber}</div>
                                    <div className="text-sm text-slate-500">{sponsor.email || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    <p className="w-48 truncate" title={sponsor.businessInfo}>{sponsor.businessInfo}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => onEdit(sponsor)} className="text-slate-600 hover:text-slate-900" title="Edit Sponsor">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(sponsor.id)} className="text-red-600 hover:text-red-900" title="Delete Sponsor">
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

export default Sponsors;
