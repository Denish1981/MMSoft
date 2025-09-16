import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { StallRegistration } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { formatUTCDate, formatCurrency } from '../utils/formatting';
import { exportToCsv } from '../utils/exportUtils';
import { CloseIcon } from '../components/icons/CloseIcon';
import { useModal } from '../contexts/ModalContext';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import FestivalNavigation from '../components/FestivalNavigation';
import { StoreIcon } from '../components/icons/StoreIcon';

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" onClick={onClose}>
        <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Full size payment proof" className="max-w-full max-h-[85vh] object-contain" />
             <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-slate-800 rounded-full p-2">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
);

interface FestivalDetails {
    name: string;
}

const StallRegistrationsPage: React.FC = () => {
    const { id: festivalId } = useParams<{ id: string }>();
    const { token, logout, hasPermission } = useAuth();
    const { openConfirmationModal } = useModal();
    const [registrations, setRegistrations] = useState<StallRegistration[]>([]);
    const [festivalDetails, setFestivalDetails] = useState<FestivalDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchRegistrations = useCallback(async () => {
        if (!festivalId || !token) return;
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [regRes, festRes] = await Promise.all([
                 fetch(`${API_URL}/festivals/${festivalId}/stall-registrations`, { headers }),
                 fetch(`${API_URL}/festivals/${festivalId}`, { headers })
            ]);

            if (regRes.status === 401 || festRes.status === 401) { logout(); return; }
            if (!regRes.ok || !festRes.ok) throw new Error('Failed to fetch data');
            
            setRegistrations(await regRes.json());
            setFestivalDetails(await festRes.json());

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [festivalId, token, logout]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);
    
    const handleDelete = useCallback((registrationId: number) => {
        // This should be a hard delete as per requirements for event registrations.
         openConfirmationModal(registrationId, 'stall-registrations', () => {
             setRegistrations(prev => prev.filter(r => r.id !== registrationId));
         });
    }, [openConfirmationModal]);

    const handleExport = () => {
        if (registrations.length === 0) return;
        
        const dataToExport = registrations.map(r => ({
            'Registrant Name': r.registrantName,
            'Contact Number': r.contactNumber,
            'Stall Dates': r.stallDates.map(d => formatUTCDate(d)).join(' | '),
            'Products': r.products.map(p => `${p.productName} (${formatCurrency(p.price)})`).join(', '),
            'Needs Electricity': r.needsElectricity ? 'Yes' : 'No',
            'Number of Tables': r.numberOfTables,
            'Total Payment': r.totalPayment,
            'Registered On': formatUTCDate(r.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }),
        }));
        
        const filename = `stall_registrations_${festivalDetails?.name.replace(/\s+/g, '_') || festivalId}`;
        exportToCsv(dataToExport, filename);
    };

    if (isLoading) return <div className="text-center p-8">Loading registrations...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    const canDelete = hasPermission('action:delete');

    return (
        <div className="space-y-6">
            {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
            <FestivalNavigation festivalId={festivalId!} festivalName={festivalDetails?.name} />
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {registrations.length} Total Stall Registrations
                    </h3>
                    <button onClick={handleExport} disabled={registrations.length === 0} className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:bg-slate-400">
                        <ExportIcon className="w-5 h-5 mr-2" />
                        Export to CSV
                    </button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registrant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Products</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registered</th>
                                {canDelete && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-slate-200">
                            {registrations.map(reg => (
                                <tr key={reg.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="text-sm font-medium text-slate-900">{reg.registrantName}</div>
                                        <div className="text-sm text-slate-500">{reg.contactNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm text-slate-500 max-w-xs">
                                        <div className="flex flex-wrap gap-1">
                                            {reg.stallDates.map(d => (
                                                <span key={d} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs">
                                                    {formatUTCDate(d)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm text-slate-500 max-w-xs">
                                        <ul className="list-disc list-inside">
                                            {reg.products.map((p, i) => <li key={i}>{p.productName} ({formatCurrency(p.price)})</li>)}
                                        </ul>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-center text-sm text-slate-500">
                                        <div>Tables: <strong>{reg.numberOfTables}</strong></div>
                                        <div>Electricity: <strong>{reg.needsElectricity ? 'Yes' : 'No'}</strong></div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                        <div className="text-sm font-semibold text-slate-800">{formatCurrency(reg.totalPayment)}</div>
                                        <img src={reg.paymentScreenshot} alt="Payment" className="mt-1 h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform ml-auto" onClick={() => setViewingImage(reg.paymentScreenshot)} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-sm text-slate-500">{formatUTCDate(reg.submittedAt)}</td>
                                    {canDelete && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                            <button onClick={() => handleDelete(reg.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete Registration">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                         </tbody>
                    </table>
                     {registrations.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <StoreIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <p className="text-lg font-semibold">No Stall Registrations Yet</p>
                            <p className="text-sm">No one has registered for a stall for this festival.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default StallRegistrationsPage;