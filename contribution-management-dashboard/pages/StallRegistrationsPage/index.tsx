import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { StallRegistration, Festival } from '../../types/index';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import { exportToCsv } from '../../utils/exportUtils';
import { formatUTCDate, formatCurrency } from '../../utils/formatting';
import { useModal } from '../../contexts/ModalContext';
import FestivalNavigation from '../../components/FestivalNavigation';
import { StoreIcon } from '../../components/icons/StoreIcon';
import ImageViewerModal from '../../components/ImageViewerModal';
import StallRegistrationsTable from './components/StallRegistrationsTable';
import ApprovalModal from './components/ApprovalModal';
import RejectionModal from './components/RejectionModal';
import StallRegistrationsByDateView from './components/StallRegistrationsByDateView';

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

type View = 'list' | 'date';

const StallRegistrationsPage: React.FC = () => {
    const { id: festivalId } = useParams<{ id: string }>();
    const { token, logout, hasPermission } = useAuth();
    const { openConfirmationModal } = useModal();
    const [registrations, setRegistrations] = useState<StallRegistration[]>([]);
    const [festivalDetails, setFestivalDetails] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [view, setView] = useState<View>('list');

    const [registrationToApprove, setRegistrationToApprove] = useState<StallRegistration | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<StallRegistration | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
         openConfirmationModal(registrationId, 'stall-registrations', () => {
             setRegistrations(prev => prev.filter(r => r.id !== registrationId));
         });
    }, [openConfirmationModal]);

    const handleStatusUpdate = async (registrationId: number, status: 'Approved' | 'Rejected', reason?: string) => {
        setIsUpdatingStatus(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/stall-registrations/${registrationId}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejectionReason: reason }),
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update status');
            }
            const updatedRegistration = await response.json();
            setRegistrations(prev => prev.map(r => r.id === registrationId ? updatedRegistration : r));
            setRegistrationToApprove(null);
            setRegistrationToReject(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

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
            'Status': r.status,
            'Rejection Reason': r.rejectionReason || 'N/A',
            'Reviewed By': r.reviewedBy || 'N/A',
            'Reviewed At': r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : 'N/A',
            'Registered On': formatUTCDate(r.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }),
        }));
        
        const filename = `stall_registrations_${festivalDetails?.name.replace(/\s+/g, '_') || festivalId}`;
        exportToCsv(dataToExport, filename);
    };

    const { registrationsByDate, allStallDates } = useMemo(() => {
        const byDate = new Map<string, StallRegistration[]>();
        const allDates = new Set<string>();

        if (festivalDetails?.stallStartDate && festivalDetails.stallEndDate) {
            let currentDate = new Date(new Date(festivalDetails.stallStartDate).toISOString().slice(0, 10));
            const endDate = new Date(new Date(festivalDetails.stallEndDate).toISOString().slice(0, 10));

            while(currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                allDates.add(dateStr);
                byDate.set(dateStr, []);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        registrations.forEach(reg => {
            if (reg.status !== 'Rejected') {
                reg.stallDates.forEach(date => {
                    const dateStr = date.split('T')[0];
                    if (byDate.has(dateStr)) {
                        byDate.get(dateStr)!.push(reg);
                    } else { // Handle case where reg date is outside festival stall dates
                        allDates.add(dateStr);
                        byDate.set(dateStr, [reg]);
                    }
                });
            }
        });

        return { 
            registrationsByDate: byDate, 
            allStallDates: Array.from(allDates).sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
        };
    }, [registrations, festivalDetails]);


    if (isLoading) return <div className="text-center p-8">Loading registrations...</div>;
    if (error && !isUpdatingStatus) return <div className="text-center p-8 text-red-500">{error}</div>;

    const canReview = hasPermission('action:edit');
    const canDelete = hasPermission('action:delete');
    
    const ViewToggle = () => (
        <div className="flex items-center p-1 bg-slate-200 rounded-lg">
            <button onClick={() => setView('list')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'}`}>List View</button>
            <button onClick={() => setView('date')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'date' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'}`}>Date View</button>
        </div>
    );

    return (
        <div className="space-y-6">
            {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
            <FestivalNavigation festivalId={festivalId!} festivalName={festivalDetails?.name} />
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {registrations.length} Total Stall Registrations
                    </h3>
                    <div className="flex items-center gap-4">
                        <ViewToggle />
                        <button onClick={handleExport} disabled={registrations.length === 0} className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:bg-slate-400">
                            <ExportIcon className="w-5 h-5 mr-2" />
                            Export
                        </button>
                    </div>
                </div>
                {registrations.length > 0 ? (
                    view === 'list' ? (
                        <StallRegistrationsTable
                            registrations={registrations}
                            onApprove={setRegistrationToApprove}
                            onReject={setRegistrationToReject}
                            onDelete={handleDelete}
                            onViewImage={setViewingImage}
                            canReview={canReview}
                            canDelete={canDelete}
                        />
                    ) : (
                        <StallRegistrationsByDateView
                            allStallDates={allStallDates}
                            registrationsByDate={registrationsByDate}
                            maxStalls={festivalDetails?.maxStalls}
                            onApprove={setRegistrationToApprove}
                            onReject={setRegistrationToReject}
                            onDelete={handleDelete}
                            onViewImage={setViewingImage}
                            canReview={canReview}
                            canDelete={canDelete}
                        />
                    )
                ) : (
                    <div className="text-center py-16 text-slate-500">
                        <StoreIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <p className="text-lg font-semibold">No Stall Registrations Yet</p>
                        <p className="text-sm">No one has registered for a stall for this festival.</p>
                    </div>
                )}
            </div>
            <ApprovalModal
                registration={registrationToApprove}
                isUpdating={isUpdatingStatus}
                onConfirm={(id) => handleStatusUpdate(id, 'Approved')}
                onClose={() => setRegistrationToApprove(null)}
            />
            <RejectionModal
                registration={registrationToReject}
                isUpdating={isUpdatingStatus}
                onConfirm={(id, reason) => handleStatusUpdate(id, 'Rejected', reason)}
                onClose={() => setRegistrationToReject(null)}
            />
        </div>
    );
};

export default StallRegistrationsPage;