import React, { useState } from 'react';
import type { Sponsor } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import ContributionsNavigation from '../components/ContributionsNavigation';
import { CloseIcon } from '../components/icons/CloseIcon';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

interface SponsorsProps {}

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" onClick={onClose}>
        <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Full size sponsor" className="max-w-full max-h-[85vh] object-contain" />
             <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-slate-800 rounded-full p-2">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
);


const Sponsors: React.FC<SponsorsProps> = () => {
    const { sponsors } = useData();
    const { openSponsorModal, openConfirmationModal, openHistoryModal } = useModal();
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    
    return (
        <div className="space-y-6">
            <ContributionsNavigation />
            {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sponsor Name</th>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th> */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business Info</th> */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {sponsors.map(sponsor => (
                                <tr key={sponsor.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {sponsor.image ? (
                                            <img 
                                                src={sponsor.image} 
                                                alt={sponsor.name}
                                                className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform mx-auto"
                                                onClick={() => setViewingImage(sponsor.image!)}
                                            />
                                        ) : (
                                            <span className="text-slate-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{sponsor.name}</td>
                                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sponsor.businessCategory}</td> */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(sponsor.sponsorshipAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(sponsor.datePaid)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sponsor.sponsorshipType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sponsor.paymentReceivedBy}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">{sponsor.contactNumber}</div>
                                        <div className="text-sm text-slate-500">{sponsor.email || 'N/A'}</div>
                                    </td>
                                    {/* <td className="px-6 py-4 text-sm text-slate-500">
                                        <p className="w-48 truncate" title={sponsor.businessInfo}>{sponsor.businessInfo}</p>
                                    </td> */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => openHistoryModal('sponsors', sponsor.id, `History for ${sponsor.name}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openSponsorModal(sponsor)} className="text-slate-600 hover:text-slate-900" title="Edit Sponsor">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openConfirmationModal(sponsor.id, 'sponsors')} className="text-red-600 hover:text-red-900" title="Delete Sponsor">
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

export default Sponsors;