import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Contribution } from '../types/index';
import { TicketIcon } from '../components/icons/TicketIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { CloseIcon } from '../components/icons/CloseIcon';
import { SaveIcon } from '../components/icons/SaveIcon';

export const FoodCouponsPage: React.FC = () => {
    const { contributions, handleUpdateContributionCoupons, festivalMap } = useData();

    // Filters state
    const [towerFilter, setTowerFilter] = useState('');
    const [flatFilter, setFlatFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'collected' | 'used'>('all');

    // Modal state for editing
    const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');

    // Form inputs state inside modal
    const [couponsCollectedInput, setCouponsCollectedInput] = useState<number>(0);
    const [dateCollectedInput, setDateCollectedInput] = useState<string>('');
    const [couponsUsedInput, setCouponsUsedInput] = useState<number>(0);

    // List of unique tower numbers for quick filter dropdown
    const uniqueTowers = useMemo(() => {
        const towers = new Set<string>();
        contributions.forEach(c => {
            if (c.towerNumber && c.towerNumber.trim()) {
                towers.add(c.towerNumber.trim());
            }
        });
        return Array.from(towers).sort();
    }, [contributions]);

    // Contributions that have requested food coupons (or all completed/approved contributions)
    const foodCouponContributions = useMemo(() => {
        return contributions.filter(c => (c.numberOfCoupons > 0 || c.couponsCollected || c.couponsUsed) && c.status !== 'Failed');
    }, [contributions]);

    // Filtered list based on search and tower/flat inputs
    const filteredContributions = useMemo(() => {
        return foodCouponContributions.filter(c => {
            // Tower filter
            if (towerFilter) {
                if (!c.towerNumber || !c.towerNumber.toLowerCase().includes(towerFilter.toLowerCase().trim())) {
                    return false;
                }
            }

            // Flat filter
            if (flatFilter) {
                if (!c.flatNumber || !c.flatNumber.toLowerCase().includes(flatFilter.toLowerCase().trim())) {
                    return false;
                }
            }

            // General search (Donor Name, Email, Phone, Contribution Ref)
            if (searchQuery) {
                const query = searchQuery.toLowerCase().trim();
                const refId = `cont-${c.id}`.toLowerCase();
                const matchesRef = refId.includes(query) || c.id.toString().includes(query);
                const matchesDonor = c.donorName.toLowerCase().includes(query);
                const matchesPhone = c.mobileNumber?.toLowerCase().includes(query) || false;
                const matchesEmail = c.donorEmail?.toLowerCase().includes(query) || false;
                if (!matchesRef && !matchesDonor && !matchesPhone && !matchesEmail) {
                    return false;
                }
            }

            // Status filter
            const collected = c.couponsCollected || 0;
            const requested = c.numberOfCoupons || 0;
            const used = c.couponsUsed || 0;

            if (statusFilter === 'pending') {
                if (collected >= requested && requested > 0) return false;
            } else if (statusFilter === 'collected') {
                if (collected === 0) return false;
            } else if (statusFilter === 'used') {
                if (used === 0) return false;
            }

            return true;
        });
    }, [foodCouponContributions, towerFilter, flatFilter, searchQuery, statusFilter]);

    // Calculated metrics
    const stats = useMemo(() => {
        let totalRequested = 0;
        let totalCollected = 0;
        let totalUsed = 0;

        foodCouponContributions.forEach(c => {
            totalRequested += Number(c.numberOfCoupons) || 0;
            totalCollected += Number(c.couponsCollected) || 0;
            totalUsed += Number(c.couponsUsed) || 0;
        });

        const pendingCollection = Math.max(0, totalRequested - totalCollected);

        return {
            totalRequested,
            totalCollected,
            totalUsed,
            pendingCollection,
            totalEntries: foodCouponContributions.length,
        };
    }, [foodCouponContributions]);

    // Open modal to update coupons for a contribution
    const handleOpenEditModal = (contribution: Contribution) => {
        setSelectedContribution(contribution);
        setCouponsCollectedInput(contribution.couponsCollected || 0);
        
        // Format date string for date picker (YYYY-MM-DD)
        if (contribution.dateCollected) {
            const d = new Date(contribution.dateCollected);
            if (!isNaN(d.getTime())) {
                setDateCollectedInput(d.toISOString().split('T')[0]);
            } else {
                setDateCollectedInput(contribution.dateCollected.split('T')[0]);
            }
        } else {
            // Default to today's date if setting collected > 0
            setDateCollectedInput(new Date().toISOString().split('T')[0]);
        }

        setCouponsUsedInput(contribution.couponsUsed || 0);
        setModalError('');
    };

    const handleCloseModal = () => {
        setSelectedContribution(null);
        setModalError('');
    };

    const handleSaveCoupons = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContribution) return;

        if (couponsCollectedInput < 0) {
            setModalError('Collected coupons cannot be negative.');
            return;
        }

        if (couponsUsedInput < 0) {
            setModalError('Used coupons cannot be negative.');
            return;
        }

        setIsSubmitting(true);
        setModalError('');

        try {
            await handleUpdateContributionCoupons(
                selectedContribution.id,
                couponsCollectedInput,
                dateCollectedInput || null,
                couponsUsedInput
            );
            handleCloseModal();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to update coupons.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetFilters = () => {
        setTowerFilter('');
        setFlatFilter('');
        setSearchQuery('');
        setStatusFilter('all');
    };

    return (
        <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TicketIcon className="w-7 h-7 text-blue-600" />
                        Food Coupons Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track requested, collected, and used food coupons by donor flat & tower number.
                    </p>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requested</p>
                        <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats.totalRequested}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Across {stats.totalEntries} entries</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <TicketIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coupons Collected</p>
                        <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.totalCollected}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {stats.totalRequested > 0 ? `${Math.round((stats.totalCollected / stats.totalRequested) * 100)}% collected` : '0%'}
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Collection</p>
                        <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pendingCollection}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Awaiting pickup</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coupons Used</p>
                        <p className="text-2xl font-extrabold text-purple-600 mt-1">{stats.totalUsed}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {stats.totalCollected > 0 ? `${Math.round((stats.totalUsed / stats.totalCollected) * 100)}% of collected used` : '0%'}
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Filter Controls Card */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                    <span>Search & Filters</span>
                    {(towerFilter || flatFilter || searchQuery || statusFilter !== 'all') && (
                        <button
                            onClick={resetFilters}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Tower Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tower Number</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="e.g. Tower A"
                                value={towerFilter}
                                onChange={(e) => setTowerFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            {uniqueTowers.length > 0 && (
                                <datalist id="tower-list">
                                    {uniqueTowers.map(t => <option key={t} value={t} />)}
                                </datalist>
                            )}
                        </div>
                    </div>

                    {/* Flat Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Flat Number</label>
                        <input
                            type="text"
                            placeholder="e.g. 402"
                            value={flatFilter}
                            onChange={(e) => setFlatFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Donor Search */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Donor Name / Ref ID</label>
                        <input
                            type="text"
                            placeholder="Search name, phone, ref..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Collection Status Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Collection Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        >
                            <option value="all">All Entries</option>
                            <option value="pending">Pending Collection</option>
                            <option value="collected">Collected</option>
                            <option value="used">Used</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Food Coupons Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800">
                        Food Coupons List ({filteredContributions.length})
                    </h2>
                </div>

                {filteredContributions.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 space-y-3">
                        <TicketIcon className="w-12 h-12 text-slate-300 mx-auto" />
                        <p className="text-base font-medium">No food coupon entries found matching your search criteria.</p>
                        <p className="text-xs text-slate-400">Try adjusting your Tower, Flat, or Name search filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200 uppercase tracking-wider">
                                    <th className="py-3 px-4">Contribution Ref & Donor</th>
                                    <th className="py-3 px-4">Tower & Flat</th>
                                    <th className="py-3 px-4 text-center">Requested Coupons</th>
                                    <th className="py-3 px-4 text-center">Coupons Collected</th>
                                    <th className="py-3 px-4">Date Collected</th>
                                    <th className="py-3 px-4 text-center">Coupons Used</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-700">
                                {filteredContributions.map((item) => {
                                    const requested = item.numberOfCoupons || 0;
                                    const collected = item.couponsCollected || 0;
                                    const used = item.couponsUsed || 0;
                                    const isFullyCollected = collected >= requested && requested > 0;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            {/* Contribution Ref & Donor */}
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">{item.donorName}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                                        #CONT-{item.id}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{new Date(item.date).toLocaleDateString()}</span>
                                                    {item.festivalId && festivalMap.has(item.festivalId) && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-blue-600">{festivalMap.get(item.festivalId)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tower & Flat */}
                                            <td className="py-3 px-4 font-medium">
                                                <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-md">
                                                    <span>T:{item.towerNumber || 'N/A'}</span>
                                                    <span>/</span>
                                                    <span>F:{item.flatNumber || 'N/A'}</span>
                                                </div>
                                            </td>

                                            {/* Requested Coupons */}
                                            <td className="py-3 px-4 text-center font-bold text-slate-900 text-base">
                                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-bold">
                                                    {requested}
                                                </span>
                                            </td>

                                            {/* Coupons Collected */}
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${
                                                    collected > 0
                                                        ? isFullyCollected
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {collected}
                                                </span>
                                            </td>

                                            {/* Date Collected */}
                                            <td className="py-3 px-4 text-xs font-medium">
                                                {item.dateCollected ? (
                                                    <span className="text-slate-800 font-semibold bg-slate-100 px-2 py-1 rounded">
                                                        {new Date(item.dateCollected).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Not collected yet</span>
                                                )}
                                            </td>

                                            {/* Coupons Used */}
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${
                                                    used > 0 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {used}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleOpenEditModal(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <EditIcon className="w-3.5 h-3.5" />
                                                    Update Coupons
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal for Adding / Updating Coupon Fields */}
            {selectedContribution && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div className="flex items-center gap-2">
                                <TicketIcon className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Update Food Coupons</h3>
                                    <p className="text-xs text-slate-500">
                                        Ref #CONT-{selectedContribution.id} • {selectedContribution.donorName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 mb-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSaveCoupons} className="space-y-4">
                            {/* Readonly Requested Info */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-slate-500">Tower/Flat:</span>{' '}
                                    <strong className="text-slate-800">
                                        Tower {selectedContribution.towerNumber}, Flat {selectedContribution.flatNumber}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-slate-500">Requested:</span>{' '}
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full">
                                        {selectedContribution.numberOfCoupons} Coupons
                                    </span>
                                </div>
                            </div>

                            {/* 1. Number of food coupons collected */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Number of Food Coupons Collected
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={couponsCollectedInput}
                                    onChange={(e) => setCouponsCollectedInput(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Number of coupons handed over or collected by the donor.
                                </p>
                            </div>

                            {/* 2. Date when food coupons collected */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Date When Food Coupons Collected
                                </label>
                                <input
                                    type="date"
                                    value={dateCollectedInput}
                                    onChange={(e) => setDateCollectedInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Date on which coupons were collected.
                                </p>
                            </div>

                            {/* 3. Number of food coupons used */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Number of Food Coupons Used
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={couponsUsedInput}
                                    onChange={(e) => setCouponsUsedInput(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Number of coupons redeemed or used at food stalls.
                                </p>
                            </div>

                            {/* Form Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <span>Saving...</span>
                                    ) : (
                                        <>
                                            <SaveIcon className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodCouponsPage;
