import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { StallRegistration, Festival } from '../../types/index';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { API_URL } from '../../config';
import { exportToCsv } from '../../utils/exportUtils';
import { formatUTCDate, formatCurrency } from '../../utils/formatting';
import { useModal } from '../../contexts/ModalContext';
import FestivalNavigation from '../../components/FestivalNavigation';
import ContributionsNavigation from '../../components/ContributionsNavigation';
import StallRegistrationModal from '../../components/StallRegistrationModal';
import { StoreIcon } from '../../components/icons/StoreIcon';
import { PlusIcon } from '../../components/icons/PlusIcon';
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
    const { id: festivalId } = useParams<{ id?: string }>();
    const { token, logout, hasPermission } = useAuth();
    const { fetchData: refreshGlobalData } = useData();
    const { openConfirmationModal } = useModal();

    const [registrations, setRegistrations] = useState<StallRegistration[]>([]);
    const [festivalDetails, setFestivalDetails] = useState<Festival | null>(null);
    const [allFestivals, setAllFestivals] = useState<Festival[]>([]);
    const [selectedFestivalFilter, setSelectedFestivalFilter] = useState<string>('all');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [view, setView] = useState<View>('list');

    const [registrationToApprove, setRegistrationToApprove] = useState<StallRegistration | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<StallRegistration | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Modal state for adding a stall registration as Manager
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedFestivalForAdd, setSelectedFestivalForAdd] = useState<Festival | null>(null);

    const fetchRegistrations = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            if (festivalId) {
                const [regRes, festRes] = await Promise.all([
                    fetch(`${API_URL}/festivals/${festivalId}/stall-registrations`, { headers }),
                    fetch(`${API_URL}/festivals/${festivalId}`, { headers })
                ]);

                if (regRes.status === 401 || festRes.status === 401) { logout(); return; }
                if (!regRes.ok || !festRes.ok) throw new Error('Failed to fetch data');

                setRegistrations(await regRes.json());
                setFestivalDetails(await festRes.json());
            } else {
                const [regRes, festRes] = await Promise.all([
                    fetch(`${API_URL}/stall-registrations`, { headers }),
                    fetch(`${API_URL}/festivals`, { headers })
                ]);

                if (regRes.status === 401 || festRes.status === 401) { logout(); return; }
                if (!regRes.ok || !festRes.ok) throw new Error('Failed to fetch data');

                setRegistrations(await regRes.json());
                const fData: Festival[] = await festRes.json();
                setAllFestivals(fData);
            }
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
            refreshGlobalData();
        });
    }, [openConfirmationModal, refreshGlobalData]);

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
            refreshGlobalData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const filteredRegistrations = useMemo(() => {
        if (festivalId) return registrations;
        if (selectedFestivalFilter === 'all') return registrations;
        return registrations.filter(r => r.festivalId === Number(selectedFestivalFilter));
    }, [registrations, festivalId, selectedFestivalFilter]);

    const activeFestivalObj = useMemo(() => {
        if (festivalId && festivalDetails) return festivalDetails;
        if (selectedFestivalFilter !== 'all') {
            return allFestivals.find(f => f.id === Number(selectedFestivalFilter)) || null;
        }
        return allFestivals.length > 0 ? allFestivals[0] : null;
    }, [festivalId, festivalDetails, selectedFestivalFilter, allFestivals]);

    const handleOpenAddModal = () => {
        if (activeFestivalObj) {
            setSelectedFestivalForAdd(activeFestivalObj);
            setIsAddModalOpen(true);
        } else if (allFestivals.length > 0) {
            setSelectedFestivalForAdd(allFestivals[0]);
            setIsAddModalOpen(true);
        } else {
            alert('No festivals found. Please create a festival first.');
        }
    };

    const handleExport = () => {
        if (filteredRegistrations.length === 0) return;

        const dataToExport = filteredRegistrations.map(r => ({
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

        const filename = `stall_registrations_${festivalDetails?.name.replace(/\s+/g, '_') || festivalId || 'all'}`;
        exportToCsv(dataToExport, filename);
    };

    const { registrationsByDate, allStallDates } = useMemo(() => {
        const byDate = new Map<string, StallRegistration[]>();
        const allDates = new Set<string>();

        const targetFestival = activeFestivalObj;

        if (targetFestival?.stallStartDate && targetFestival.stallEndDate) {
            let currentDate = new Date(new Date(targetFestival.stallStartDate).toISOString().slice(0, 10));
            const endDate = new Date(new Date(targetFestival.stallEndDate).toISOString().slice(0, 10));

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                allDates.add(dateStr);
                byDate.set(dateStr, []);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        filteredRegistrations.forEach(reg => {
            if (reg.status !== 'Rejected') {
                reg.stallDates.forEach(date => {
                    const dateStr = date.split('T')[0];
                    if (byDate.has(dateStr)) {
                        byDate.get(dateStr)!.push(reg);
                    } else {
                        allDates.add(dateStr);
                        byDate.set(dateStr, [reg]);
                    }
                });
            }
        });

        return {
            registrationsByDate: byDate,
            allStallDates: Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        };
    }, [filteredRegistrations, activeFestivalObj]);

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

            {festivalId ? (
                <FestivalNavigation festivalId={festivalId} festivalName={festivalDetails?.name} />
            ) : (
                <ContributionsNavigation />
            )}

            <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">
                            Stall Registrations
                        </h3>
                        <p className="text-sm text-slate-500">
                            {filteredRegistrations.length} Total Registrations Found
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {!festivalId && allFestivals.length > 0 && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-600">Festival:</label>
                                <select
                                    value={selectedFestivalFilter}
                                    onChange={e => setSelectedFestivalFilter(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Festivals</option>
                                    {allFestivals.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <ViewToggle />

                        {canReview && (
                            <button
                                onClick={handleOpenAddModal}
                                className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-semibold"
                            >
                                <PlusIcon className="w-5 h-5 mr-1.5" />
                                Add Stall Registration
                            </button>
                        )}

                        <button
                            onClick={handleExport}
                            disabled={filteredRegistrations.length === 0}
                            className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-sm font-semibold disabled:bg-slate-400"
                        >
                            <ExportIcon className="w-5 h-5 mr-1.5" />
                            Export
                        </button>
                    </div>
                </div>

                {filteredRegistrations.length > 0 ? (
                    view === 'list' ? (
                        <StallRegistrationsTable
                            registrations={filteredRegistrations}
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
                            maxStalls={activeFestivalObj?.maxStalls}
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
                        <p className="text-lg font-semibold">No Stall Registrations Found</p>
                        <p className="text-sm">There are no stall registrations for the selected view.</p>
                        {canReview && (
                            <button
                                onClick={handleOpenAddModal}
                                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
                            >
                                <PlusIcon className="w-4 h-4 mr-1.5" /> Add First Stall Registration
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Manager Add Stall Registration Modal */}
            {isAddModalOpen && selectedFestivalForAdd && (
                <div>
                    {!festivalId && allFestivals.length > 1 && (
                        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
                            <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-xs flex items-center gap-3 border border-slate-700">
                                <span>Registering stall for: <strong>{selectedFestivalForAdd.name}</strong></span>
                                <select
                                    value={selectedFestivalForAdd.id}
                                    onChange={e => {
                                        const fest = allFestivals.find(f => f.id === Number(e.target.value));
                                        if (fest) setSelectedFestivalForAdd(fest);
                                    }}
                                    className="bg-slate-800 text-white rounded px-2 py-0.5 text-xs border border-slate-600 focus:outline-none"
                                >
                                    {allFestivals.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <StallRegistrationModal
                        festival={selectedFestivalForAdd}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setSelectedFestivalForAdd(null);
                            fetchRegistrations();
                            refreshGlobalData();
                        }}
                    />
                </div>
            )}

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
