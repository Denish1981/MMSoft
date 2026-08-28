import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Contribution } from '../types/index';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import { 
    Search, 
    Check, 
    X, 
    Edit2, 
    Filter, 
    CreditCard, 
    Building, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    RotateCcw,
    Sparkles,
    Eye
} from 'lucide-react';
import ImageViewerModal from '../components/ImageViewerModal';
import { PaginationControls } from '../components/PaginationControls';
import { TOWER_OPTIONS, normalizeTowerNumber, normalizeFlatNumber } from '../utils/donorLocationUtils';

export const BankReconciliationPage: React.FC = () => {
    const { contributions, festivals, campaigns, handleUpdateContributionTransactionRef, festivalMap } = useData();
    const { hasPermission } = useAuth();
    const isManager = hasPermission('action:edit') || hasPermission('action:users:manage');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'missing' | 'matched'>('missing');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterFestival, setFilterFestival] = useState<string>('all');
    const [towerFilter, setTowerFilter] = useState<string>('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    
    // Inline editing states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [saveSuccessId, setSaveSuccessId] = useState<number | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // List of active contributions that are completed or approved
    const validContributions = useMemo(() => {
        return contributions.filter(c => c.status !== 'Failed');
    }, [contributions]);

    // Unique towers for filtering
    const uniqueTowers = useMemo(() => {
        const set = new Set<string>(TOWER_OPTIONS);
        validContributions.forEach(c => {
            const t = normalizeTowerNumber(c.towerNumber);
            if (t) set.add(t);
        });
        return Array.from(set).sort((a, b) => {
            const na = parseInt(a, 10);
            const nb = parseInt(b, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
        });
    }, [validContributions]);

    // Unique payment types
    const paymentTypes = useMemo(() => {
        const set = new Set<string>();
        validContributions.forEach(c => {
            if (c.type) set.add(c.type);
        });
        return Array.from(set).sort();
    }, [validContributions]);

    // Summary statistics
    const stats = useMemo(() => {
        let totalCount = validContributions.length;
        let matchedCount = 0;
        let missingCount = 0;
        let totalAmount = 0;
        let matchedAmount = 0;
        let missingAmount = 0;

        validContributions.forEach(c => {
            const amt = Number(c.amount) || 0;
            totalAmount += amt;
            const hasUtr = Boolean(c.transactionRef && c.transactionRef.trim().length > 0);
            if (hasUtr) {
                matchedCount++;
                matchedAmount += amt;
            } else {
                missingCount++;
                missingAmount += amt;
            }
        });

        const reconciliationRate = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

        return {
            totalCount,
            matchedCount,
            missingCount,
            totalAmount,
            matchedAmount,
            missingAmount,
            reconciliationRate
        };
    }, [validContributions]);

    // Filtered list
    const filteredContributions = useMemo(() => {
        return validContributions.filter(c => {
            const hasUtr = Boolean(c.transactionRef && c.transactionRef.trim().length > 0);

            // Filter missing vs matched
            if (filterStatus === 'missing' && hasUtr) return false;
            if (filterStatus === 'matched' && !hasUtr) return false;

            // Filter payment type
            if (filterType !== 'all' && c.type !== filterType) return false;

            // Filter festival
            if (filterFestival !== 'all') {
                if (c.festivalId?.toString() !== filterFestival && c.campaignId?.toString() !== filterFestival) {
                    return false;
                }
            }

            // Tower filter
            if (towerFilter !== 'all') {
                const normC = normalizeTowerNumber(c.towerNumber);
                const normFilter = normalizeTowerNumber(towerFilter);
                if (normC !== normFilter && c.towerNumber !== towerFilter) return false;
            }

            // Search query
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim();
                const towerFlat = `${c.towerNumber || ''}-${c.flatNumber || ''}`.toLowerCase();
                const matchesDonor = c.donorName.toLowerCase().includes(q);
                const matchesEmail = c.donorEmail?.toLowerCase().includes(q) || false;
                const matchesPhone = c.mobileNumber?.includes(q) || false;
                const matchesRef = c.transactionRef?.toLowerCase().includes(q) || false;
                const matchesTowerFlat = towerFlat.includes(q);
                const matchesId = `rec-${c.id}`.toLowerCase().includes(q) || c.id.toString() === q;
                const matchesAmount = c.amount.toString().includes(q);

                if (!matchesDonor && !matchesEmail && !matchesPhone && !matchesRef && !matchesTowerFlat && !matchesId && !matchesAmount) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            // Sort by date descending
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [validContributions, filterStatus, filterType, filterFestival, towerFilter, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredContributions.length / rowsPerPage);
    const paginatedContributions = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredContributions.slice(start, start + rowsPerPage);
    }, [filteredContributions, currentPage, rowsPerPage]);

    // Handlers for pagination
    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleFilterStatusChange = (val: 'all' | 'missing' | 'matched') => {
        setFilterStatus(val);
        setCurrentPage(1);
    };

    const handleFilterTypeChange = (val: string) => {
        setFilterType(val);
        setCurrentPage(1);
    };

    const handleTowerFilterChange = (val: string) => {
        setTowerFilter(val);
        setCurrentPage(1);
    };

    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        setCurrentPage(1);
    };

    const startEditing = (c: Contribution) => {
        setEditingId(c.id);
        setEditValue(c.transactionRef || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleSave = async (id: number) => {
        if (!isManager) {
            alert('Only Managers and Admins can update transaction references.');
            return;
        }

        try {
            setSavingId(id);
            await handleUpdateContributionTransactionRef(id, editValue.trim() || null);
            setSavingId(null);
            setEditingId(null);
            setSaveSuccessId(id);
            setTimeout(() => {
                setSaveSuccessId(prev => prev === id ? null : prev);
            }, 2500);
        } catch (err) {
            setSavingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave(id);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-7 h-7 text-blue-600" />
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bank Statement & UTR Reconciliation</h1>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Easily reconcile bank statements by matching and updating 12-digit UTR numbers, UPI reference IDs, and Cheque numbers in bulk or inline.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-right">
                            <span className="text-xs font-semibold uppercase text-blue-700 block">Reconciled Progress</span>
                            <span className="text-xl font-bold text-blue-900">{stats.matchedCount} / {stats.totalCount} ({stats.reconciliationRate}%)</span>
                        </div>
                    </div>
                </div>

                {/* Quick KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div 
                        onClick={() => handleFilterStatusChange('missing')}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                            filterStatus === 'missing' 
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
                                : 'bg-slate-50 border-slate-200 hover:bg-amber-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600" /> Missing UTR / Reference
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                                {stats.missingCount}
                            </span>
                        </div>
                        <p className="text-2xl font-black text-amber-900 mt-2">{formatCurrency(stats.missingAmount)}</p>
                        <p className="text-xs text-amber-700 mt-0.5">Needs bank statement matching</p>
                    </div>

                    <div 
                        onClick={() => handleFilterStatusChange('matched')}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                            filterStatus === 'matched' 
                                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
                                : 'bg-slate-50 border-slate-200 hover:bg-emerald-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reconciled with UTR
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                                {stats.matchedCount}
                            </span>
                        </div>
                        <p className="text-2xl font-black text-emerald-900 mt-2">{formatCurrency(stats.matchedAmount)}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Matched & verified in bank statement</p>
                    </div>

                    <div 
                        onClick={() => handleFilterStatusChange('all')}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                            filterStatus === 'all' 
                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
                                : 'bg-slate-50 border-slate-200 hover:bg-blue-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-blue-800 flex items-center gap-1.5">
                                <RotateCcw className="w-4 h-4 text-blue-600" /> Total Contributions
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold">
                                {stats.totalCount}
                            </span>
                        </div>
                        <p className="text-2xl font-black text-blue-900 mt-2">{formatCurrency(stats.totalAmount)}</p>
                        <p className="text-xs text-blue-700 mt-0.5">All active collection records</p>
                    </div>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search query */}
                    <div className="lg:col-span-2 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search donor name, tower-flat, phone, amount..."
                            value={searchTerm}
                            onChange={e => handleSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Status filter */}
                    <div>
                        <select
                            value={filterStatus}
                            onChange={e => handleFilterStatusChange(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="missing">⚠️ Missing UTR Only ({stats.missingCount})</option>
                            <option value="matched">✅ Reconciled Only ({stats.matchedCount})</option>
                            <option value="all">🔍 Show All ({stats.totalCount})</option>
                        </select>
                    </div>

                    {/* Payment type filter */}
                    <div>
                        <select
                            value={filterType}
                            onChange={e => handleFilterTypeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Payment Types</option>
                            {paymentTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tower filter */}
                    <div>
                        <select
                            value={towerFilter}
                            onChange={e => handleTowerFilterChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Towers</option>
                            {uniqueTowers.map(t => (
                                <option key={t} value={t}>Tower {t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                        Showing <strong className="text-slate-800">{filteredContributions.length}</strong> matching entries {filteredContributions.length > rowsPerPage && `(Page ${currentPage} of ${totalPages})`}
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600">
                        <Sparkles className="w-3.5 h-3.5" /> Click on the UTR column to edit inline, press <strong>Enter</strong> to save.
                    </span>
                </div>
            </div>

            {/* Reconciliation Table */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Donor Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile Number</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Residence</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider min-w-[260px]">
                                    Bank Ref / UTR / Cheque No. (Inline Edit)
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedContributions.length > 0 ? (
                                paginatedContributions.map(c => {
                                    const isEditing = editingId === c.id;
                                    const isSaving = savingId === c.id;
                                    const justSaved = saveSuccessId === c.id;
                                    const towerFlat = c.towerNumber && c.flatNumber 
                                        ? `T-${c.towerNumber}, F-${c.flatNumber}`
                                        : (c.towerNumber || c.flatNumber || 'N/A');

                                    return (
                                        <tr key={c.id} className={`hover:bg-blue-50/40 transition-colors ${justSaved ? 'bg-emerald-50/80' : ''}`}>
                                            {/* Date */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                                                {formatUTCDate(c.date)}
                                            </td>

                                            {/* Donor Name */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{c.donorName}</div>
                                                {c.donorEmail && (
                                                    <div className="text-xs text-slate-400 truncate max-w-[180px]">{c.donorEmail}</div>
                                                )}
                                            </td>

                                            {/* Mobile Number */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700">
                                                {c.mobileNumber ? (
                                                    <a 
                                                        href={`tel:${c.mobileNumber}`} 
                                                        className="font-mono text-slate-800 hover:text-blue-600 hover:underline inline-flex items-center gap-1 bg-slate-50 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200"
                                                    >
                                                        <span>📞</span> {c.mobileNumber}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">N/A</span>
                                                )}
                                            </td>

                                            {/* Residence (Tower - Flat) */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                                                <span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium border border-slate-200">
                                                    {towerFlat}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                                                {formatCurrency(c.amount)}
                                            </td>

                                            {/* Payment Type */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    c.type === 'Cash' 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : c.type === 'Online' || c.type === 'UPI' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {c.type || 'N/A'}
                                                </span>
                                            </td>

                                            {/* UTR Reference - Interactive Inline Editor */}
                                            <td className="px-4 py-3.5">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, c.id)}
                                                            placeholder="Enter UTR / UPI Ref / Cheque No..."
                                                            disabled={isSaving}
                                                            className="w-full px-2.5 py-1.5 border-2 border-blue-500 rounded-md text-xs font-mono bg-white shadow-sm focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => handleSave(c.id)}
                                                            disabled={isSaving}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-sm"
                                                            title="Save UTR (Enter)"
                                                        >
                                                            {isSaving ? (
                                                                <span className="w-3.5 h-3.5 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            disabled={isSaving}
                                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition"
                                                            title="Cancel (Esc)"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => isManager && startEditing(c)}
                                                        className={`group flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer ${
                                                            c.transactionRef 
                                                                ? 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50' 
                                                                : 'bg-amber-50/60 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/50'
                                                        }`}
                                                        title={isManager ? "Click to edit UTR / Reference" : undefined}
                                                    >
                                                        {c.transactionRef ? (
                                                            <span className="font-mono text-xs text-slate-800 font-medium truncate max-w-[220px]">
                                                                {c.transactionRef}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-amber-700 italic flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3 text-amber-600" /> Click to add UTR...
                                                            </span>
                                                        )}

                                                        {isManager && (
                                                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 text-blue-600" />
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Proof Image / Receipt screenshot */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                {c.image ? (
                                                    <button
                                                        onClick={() => setViewingImage(c.image!)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
                                                        title="View uploaded payment screenshot"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-blue-600" /> View
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">None</span>
                                                )}
                                            </td>

                                            {/* Quick Actions */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs">
                                                {justSaved ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs animate-fade-in">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                                    </span>
                                                ) : isEditing ? (
                                                    <span className="text-blue-600 font-semibold text-xs">Editing...</span>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(c)}
                                                        disabled={!isManager}
                                                        className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium rounded transition"
                                                    >
                                                        {c.transactionRef ? 'Update' : '+ Add UTR'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">
                                        <div className="max-w-sm mx-auto space-y-2">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                            <p className="font-semibold text-slate-700">No contributions found matching filters</p>
                                            <p className="text-xs text-slate-400">
                                                {filterStatus === 'missing' 
                                                    ? 'All contributions are reconciled with UTR numbers!' 
                                                    : 'Try adjusting your search query or tower filters.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredContributions.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <PaginationControls
                            rowsPerPage={rowsPerPage}
                            setRowsPerPage={(rows) => {
                                setRowsPerPage(rows);
                                setCurrentPage(1);
                            }}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredContributions.length}
                            onPreviousPage={handlePreviousPage}
                            onNextPage={handleNextPage}
                        />
                    </div>
                )}
            </div>

            {viewingImage && (
                <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
            )}
        </div>
    );
};

export default BankReconciliationPage;
