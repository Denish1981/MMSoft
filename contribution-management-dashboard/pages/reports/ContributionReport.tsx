import React, { useState, useMemo, useEffect } from 'react';
import type { Contribution } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, FilterContainer, SelectInput } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';
import { formatReceiptNo, matchesReceiptFilter, ReceiptData } from '../../utils/receiptUtils';
import { TOWER_OPTIONS, generateFlatOptions, normalizeTowerNumber, normalizeFlatNumber, getFloorFromFlat } from '../../utils/donorLocationUtils';
import { ReceiptModal } from '../../components/ReceiptModal';
import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { useData } from '../../contexts/DataContext';
import { 
    Receipt, 
    Home, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Printer, 
    Download, 
    Utensils, 
    Search,
    Building2,
    DollarSign
} from 'lucide-react';

interface ContributionReportProps {
    contributions: Contribution[];
}

interface ContributionFilters {
    receiptNo: string;
    towerNumber: string;
    flatNumber: string;
    donorName: string;
    mobileNumber: string;
    amountComparator: string;
    amountValue: string;
    type: string;
}

interface DoorToDoorItem {
    towerNumber: string;
    flatNumber: string;
    floor: number;
    hasContributed: boolean;
    donorName: string;
    donorEmail: string;
    mobileNumber: string;
    totalAmount: number;
    totalCoupons: number;
    paymentModes: string;
    receiptNumbers: string;
    contributionCount: number;
    latestDate: string;
    status: string;
}

const ContributionReport: React.FC<ContributionReportProps> = ({ contributions }) => {
    const { campaigns, festivals, donors } = useData();
    const campaignMap = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    // Active View Mode: 'receipts' (individual records) or 'door-to-door' (flat-by-flat roster)
    const [viewMode, setViewMode] = useState<'receipts' | 'door-to-door'>('receipts');

    // Filters for Individual Receipts view
    const [receiptFilters, setReceiptFilters] = useState<ContributionFilters>({
        receiptNo: '',
        towerNumber: '',
        flatNumber: '',
        donorName: '',
        mobileNumber: '',
        amountComparator: '>=',
        amountValue: '',
        type: '',
    });
    const [receiptPage, setReceiptPage] = useState(1);
    const [receiptRowsPerPage, setReceiptRowsPerPage] = useState(10);
    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

    // Filters for Door-to-Door Roster view
    const [d2dTower, setD2dTower] = useState<string>('all');
    const [d2dFloor, setD2dFloor] = useState<string>('all');
    const [d2dStatus, setD2dStatus] = useState<'all' | 'contributed' | 'not_contributed'>('all');
    const [d2dSearch, setD2dSearch] = useState<string>('');
    const [d2dPage, setD2dPage] = useState(1);
    const [d2dRowsPerPage, setD2dRowsPerPage] = useState(25);

    // -------------------------------------------------------------
    // DISCOVER TOWERS & FLATS FOR DOOR-TO-DOOR ROSTER
    // -------------------------------------------------------------
    const availableTowers = useMemo(() => {
        const set = new Set<string>(TOWER_OPTIONS);
        contributions.forEach(c => {
            const t = normalizeTowerNumber(c.towerNumber);
            if (t) {
                set.add(t);
            }
        });
        if (donors) {
            donors.forEach(d => {
                const t = normalizeTowerNumber(d.towerNumber);
                if (t) {
                    set.add(t);
                }
            });
        }
        return Array.from(set).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    }, [contributions, donors]);

    // Standard flat options (33 floors x 13 flats per floor)
    const flatOptionGroups = useMemo(() => generateFlatOptions(), []);

    // Generate comprehensive list of all flats across towers
    const allDoorToDoorData = useMemo(() => {
        // Group valid contributions by normalized tower + flat
        const contribMap = new Map<string, Contribution[]>();
        
        contributions.forEach(c => {
            if (c.status === 'Failed') return;
            const t = normalizeTowerNumber(c.towerNumber);
            const f = normalizeFlatNumber(c.flatNumber);
            if (!t || !f) return;
            const key = `${t}___${f}`;
            if (!contribMap.has(key)) {
                contribMap.set(key, []);
            }
            contribMap.get(key)!.push(c);
        });

        // Also map registered donors if they haven't contributed yet
        const donorMap = new Map<string, typeof donors[0]>();
        if (donors) {
            donors.forEach(d => {
                const t = normalizeTowerNumber(d.towerNumber);
                const f = normalizeFlatNumber(d.flatNumber);
                if (t && f) {
                    donorMap.set(`${t}___${f}`, d);
                }
            });
        }

        const items: DoorToDoorItem[] = [];

        // Build flat roster for every tower in availableTowers
        availableTowers.forEach(tower => {
            // Standard flats 101 to 3313
            const seenFlatsInTower = new Set<string>();

            flatOptionGroups.forEach(group => {
                const floorNumber = parseInt(group.floorLabel.replace(/\D/g, ''), 10) || 1;
                group.options.forEach(flat => {
                    const normFlat = normalizeFlatNumber(flat);
                    seenFlatsInTower.add(normFlat.toLowerCase());
                    const key = `${tower}___${normFlat}`;
                    const list = contribMap.get(key) || [];
                    const donorInfo = donorMap.get(key);

                    if (list.length > 0) {
                        const totalAmt = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                        const totalCoupons = list.reduce((sum, item) => sum + (Number(item.numberOfCoupons) || 0), 0);
                        const donorNames = Array.from(new Set(list.map(i => i.donorName).filter(Boolean))).join(', ');
                        const emails = Array.from(new Set(list.map(i => i.donorEmail).filter(Boolean))).join(', ');
                        const phones = Array.from(new Set(list.map(i => i.mobileNumber).filter(Boolean))).join(', ');
                        const types = Array.from(new Set(list.map(i => i.type).filter(Boolean))).join(', ');
                        const receiptNos = list.map(i => formatReceiptNo(i.id, 'contribution')).join(', ');
                        const sortedDates = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const latestDate = sortedDates[0]?.date || '';

                        items.push({
                            towerNumber: tower,
                            flatNumber: normFlat,
                            floor: floorNumber,
                            hasContributed: true,
                            donorName: donorNames,
                            donorEmail: emails,
                            mobileNumber: phones,
                            totalAmount: totalAmt,
                            totalCoupons: totalCoupons,
                            paymentModes: types,
                            receiptNumbers: receiptNos,
                            contributionCount: list.length,
                            latestDate: latestDate,
                            status: 'Contributed'
                        });
                    } else {
                        // Not contributed
                        items.push({
                            towerNumber: tower,
                            flatNumber: normFlat,
                            floor: floorNumber,
                            hasContributed: false,
                            donorName: donorInfo?.name || '',
                            donorEmail: donorInfo?.email || '',
                            mobileNumber: donorInfo?.mobileNumber || '',
                            totalAmount: 0,
                            totalCoupons: 0,
                            paymentModes: '',
                            receiptNumbers: '',
                            contributionCount: 0,
                            latestDate: '',
                            status: 'Not Contributed'
                        });
                    }
                });
            });

            // If there are custom flats not in standard options for this tower, append them
            contributions.forEach(c => {
                if (c.status === 'Failed') return;
                const t = normalizeTowerNumber(c.towerNumber);
                const f = normalizeFlatNumber(c.flatNumber);
                if (t === tower && f && !seenFlatsInTower.has(f.toLowerCase())) {
                    seenFlatsInTower.add(f.toLowerCase());
                    const key = `${tower}___${f}`;
                    const list = contribMap.get(key) || [];
                    const floorNum = getFloorFromFlat(f);
                    const totalAmt = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                    const totalCoupons = list.reduce((sum, item) => sum + (Number(item.numberOfCoupons) || 0), 0);
                    const donorNames = Array.from(new Set(list.map(i => i.donorName).filter(Boolean))).join(', ');
                    const emails = Array.from(new Set(list.map(i => i.donorEmail).filter(Boolean))).join(', ');
                    const phones = Array.from(new Set(list.map(i => i.mobileNumber).filter(Boolean))).join(', ');
                    const types = Array.from(new Set(list.map(i => i.type).filter(Boolean))).join(', ');
                    const receiptNos = list.map(i => formatReceiptNo(i.id, 'contribution')).join(', ');
                    const latestDate = list[0]?.date || '';

                    items.push({
                        towerNumber: tower,
                        flatNumber: f,
                        floor: floorNum,
                        hasContributed: true,
                        donorName: donorNames,
                        donorEmail: emails,
                        mobileNumber: phones,
                        totalAmount: totalAmt,
                        totalCoupons: totalCoupons,
                        paymentModes: types,
                        receiptNumbers: receiptNos,
                        contributionCount: list.length,
                        latestDate: latestDate,
                        status: 'Contributed'
                    });
                }
            });
        });

        return items;
    }, [availableTowers, flatOptionGroups, contributions, donors]);

    // -------------------------------------------------------------
    // FILTERED DOOR-TO-DOOR DATA & STATISTICS
    // -------------------------------------------------------------
    const filteredDoorToDoorData = useMemo(() => {
        return allDoorToDoorData.filter(item => {
            // Tower filter
            if (d2dTower !== 'all' && item.towerNumber.toLowerCase() !== d2dTower.toLowerCase()) {
                return false;
            }

            // Floor filter
            if (d2dFloor !== 'all' && item.floor !== parseInt(d2dFloor, 10)) {
                return false;
            }

            // Status filter
            if (d2dStatus === 'contributed' && !item.hasContributed) {
                return false;
            }
            if (d2dStatus === 'not_contributed' && item.hasContributed) {
                return false;
            }

            // Search query (Flat No, Donor Name, Phone, Email, Receipt)
            if (d2dSearch.trim()) {
                const query = d2dSearch.toLowerCase().trim();
                const matchesFlat = item.flatNumber.toLowerCase().includes(query);
                const matchesName = item.donorName.toLowerCase().includes(query);
                const matchesPhone = item.mobileNumber.toLowerCase().includes(query);
                const matchesReceipt = item.receiptNumbers.toLowerCase().includes(query);
                const matchesTower = `tower ${item.towerNumber}`.toLowerCase().includes(query) || item.towerNumber.toLowerCase() === query;
                if (!matchesFlat && !matchesName && !matchesPhone && !matchesReceipt && !matchesTower) {
                    return false;
                }
            }

            return true;
        });
    }, [allDoorToDoorData, d2dTower, d2dFloor, d2dStatus, d2dSearch]);

    // Metrics for Door-to-Door View
    const d2dStats = useMemo(() => {
        let totalFlats = filteredDoorToDoorData.length;
        let contributedFlats = 0;
        let totalCollectedAmount = 0;
        let totalRequestedCoupons = 0;

        filteredDoorToDoorData.forEach(item => {
            if (item.hasContributed) {
                contributedFlats++;
                totalCollectedAmount += item.totalAmount;
                totalRequestedCoupons += item.totalCoupons;
            }
        });

        const notContributedFlats = totalFlats - contributedFlats;
        const coveragePercentage = totalFlats > 0 ? ((contributedFlats / totalFlats) * 100).toFixed(1) : '0.0';

        return {
            totalFlats,
            contributedFlats,
            notContributedFlats,
            coveragePercentage,
            totalCollectedAmount,
            totalRequestedCoupons
        };
    }, [filteredDoorToDoorData]);

    // Pagination for Door-to-Door Table
    useEffect(() => {
        setD2dPage(1);
    }, [d2dTower, d2dFloor, d2dStatus, d2dSearch, d2dRowsPerPage]);

    const totalD2dPages = d2dRowsPerPage === -1 ? 1 : Math.ceil(filteredDoorToDoorData.length / d2dRowsPerPage);
    const paginatedD2dData = useMemo(() => {
        if (d2dRowsPerPage === -1) return filteredDoorToDoorData;
        const startIndex = (d2dPage - 1) * d2dRowsPerPage;
        return filteredDoorToDoorData.slice(startIndex, startIndex + d2dRowsPerPage);
    }, [filteredDoorToDoorData, d2dPage, d2dRowsPerPage]);

    // -------------------------------------------------------------
    // FILTERED INDIVIDUAL RECEIPTS DATA
    // -------------------------------------------------------------
    const filteredContributions = useMemo(() => {
        return contributions.filter(c => {
            if (receiptFilters.receiptNo && !matchesReceiptFilter(c.id, 'contribution', receiptFilters.receiptNo)) return false;
            if (receiptFilters.towerNumber && !c.towerNumber.toLowerCase().includes(receiptFilters.towerNumber.toLowerCase())) return false;
            if (receiptFilters.flatNumber && !c.flatNumber.toLowerCase().includes(receiptFilters.flatNumber.toLowerCase())) return false;
            if (receiptFilters.donorName && !c.donorName.toLowerCase().includes(receiptFilters.donorName.toLowerCase())) return false;
            if (receiptFilters.mobileNumber && c.mobileNumber && !c.mobileNumber.includes(receiptFilters.mobileNumber)) return false;
            if (receiptFilters.type && c.type !== receiptFilters.type) return false;
            
            if (receiptFilters.amountValue) {
                const amountFilterValue = parseFloat(receiptFilters.amountValue);
                const contributionAmount = parseFloat(String(c.amount));
                if (!isNaN(amountFilterValue)) {
                    if (receiptFilters.amountComparator === '>=' && contributionAmount < amountFilterValue) return false;
                    if (receiptFilters.amountComparator === '<=' && contributionAmount > amountFilterValue) return false;
                    if (receiptFilters.amountComparator === '==' && contributionAmount !== amountFilterValue) return false;
                }
            }
            return true;
        });
    }, [contributions, receiptFilters]);

    useEffect(() => {
        setReceiptPage(1);
    }, [receiptFilters, receiptRowsPerPage]);

    const totalReceiptPages = Math.ceil(filteredContributions.length / receiptRowsPerPage);
    const paginatedContributions = useMemo(() => {
        const startIndex = (receiptPage - 1) * receiptRowsPerPage;
        return filteredContributions.slice(startIndex, startIndex + receiptRowsPerPage);
    }, [filteredContributions, receiptPage, receiptRowsPerPage]);

    // -------------------------------------------------------------
    // ACTIONS & EXPORTS
    // -------------------------------------------------------------
    const openReceipt = (c: Contribution) => {
        const rData: ReceiptData = {
            receiptNo: formatReceiptNo(c.id, 'contribution'),
            category: 'contribution',
            title: 'Individual Contribution',
            date: c.date,
            payerName: c.donorName,
            payerEmail: c.donorEmail,
            payerPhone: c.mobileNumber,
            towerNumber: c.towerNumber,
            flatNumber: c.flatNumber,
            amount: Number(c.amount),
            paymentMode: c.type,
            festivalOrCampaign: (c.festivalId && festivalMap.get(c.festivalId)) || (c.campaignId && campaignMap.get(c.campaignId)) || 'General Campaign',
            status: c.status || 'Completed',
            details: [
                { label: 'Food Coupons', value: String(c.numberOfCoupons || 0) },
                { label: 'Tower & Flat', value: `Tower ${c.towerNumber || 'N/A'}, Flat ${c.flatNumber || 'N/A'}` },
            ]
        };
        setSelectedReceipt(rData);
    };

    const handleExportReceipts = () => {
        const dataToExport = filteredContributions.map(c => ({
            'Receipt No': formatReceiptNo(c.id, 'contribution'),
            'Donor Name': c.donorName,
            'Donor Email': c.donorEmail || '',
            'Mobile Number': c.mobileNumber || '',
            'Tower Number': c.towerNumber,
            'Flat Number': c.flatNumber,
            'Amount': c.amount,
            'Type': c.type,
            'Number of Coupons': c.numberOfCoupons,
            'Campaign / Festival': (c.festivalId && festivalMap.get(c.festivalId)) || (c.campaignId && campaignMap.get(c.campaignId)) || 'N/A',
            'Date': new Date(c.date).toLocaleString(),
            'Status': c.status,
        }));
        exportToCsv(dataToExport, 'contribution_receipts_report');
    };

    const handleExportDoorToDoor = () => {
        const dataToExport = filteredDoorToDoorData.map(item => ({
            'Tower': `Tower ${item.towerNumber}`,
            'Flat Number': item.flatNumber,
            'Floor': item.floor,
            'Status': item.hasContributed ? 'Contributed' : 'Not Contributed',
            'Resident / Donor Name': item.donorName || '',
            'Mobile Number': item.mobileNumber || '',
            'Email': item.donorEmail || '',
            'Amount (INR)': item.hasContributed ? item.totalAmount : 0,
            'Food Coupons Requested': item.hasContributed ? item.totalCoupons : 0,
            'Payment Mode': item.paymentModes || '',
            'Receipt Numbers': item.receiptNumbers || '',
            'Last Date': item.latestDate ? formatUTCDate(item.latestDate) : '',
            'Volunteer Sign & Notes': '' // Placeholder column for clipboard printouts
        }));
        exportToCsv(dataToExport, `door_to_door_flat_roster_${d2dTower !== 'all' ? `tower_${d2dTower}` : 'all_towers'}`);
    };

    const handlePrintDoorToDoor = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* View Mode Toggle Bar */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('receipts')}
                        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                            viewMode === 'receipts'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Individual Receipts
                        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700">
                            {contributions.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode('door-to-door')}
                        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                            viewMode === 'door-to-door'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Home className="w-4 h-4" />
                        Door-to-Door Flat Roster
                        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                            Ready for Volunteers
                        </span>
                    </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2">
                    {viewMode === 'receipts' ? (
                        <>
                            <button
                                onClick={handleExportDoorToDoor}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                title="Export complete flat roster (Contributed & Non-contributed) for door collection"
                            >
                                <Home className="w-3.5 h-3.5" />
                                Export Door-to-Door CSV
                            </button>
                            <button
                                onClick={handleExportReceipts}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export Receipts CSV
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handlePrintDoorToDoor}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                Print Sheet
                            </button>
                            <button
                                onClick={handleExportDoorToDoor}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export Door-to-Door CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: DOOR-TO-DOOR FLAT ROSTER VIEW */}
            {/* ========================================================= */}
            {viewMode === 'door-to-door' && (
                <div className="space-y-6">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                                <span>Total Flats</span>
                                <Building2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{d2dStats.totalFlats}</div>
                            <div className="text-xs text-slate-500 mt-1">In current filter</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                            <div className="flex items-center justify-between text-emerald-700 text-xs font-medium uppercase tracking-wider mb-1">
                                <span>Contributed</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">{d2dStats.contributedFlats}</div>
                            <div className="text-xs text-emerald-600 mt-1 font-medium">{d2dStats.coveragePercentage}% coverage</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
                            <div className="flex items-center justify-between text-amber-700 text-xs font-medium uppercase tracking-wider mb-1">
                                <span>Pending / Not Yet</span>
                                <XCircle className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-bold text-amber-700">{d2dStats.notContributedFlats}</div>
                            <div className="text-xs text-amber-600 mt-1">Need collection</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-blue-50/20">
                            <div className="flex items-center justify-between text-blue-700 text-xs font-medium uppercase tracking-wider mb-1">
                                <span>Total Collected</span>
                                <DollarSign className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-xl font-bold text-blue-700 truncate">{formatCurrency(d2dStats.totalCollectedAmount)}</div>
                            <div className="text-xs text-blue-600 mt-1">From contributed flats</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200 bg-purple-50/20 col-span-2 md:col-span-1">
                            <div className="flex items-center justify-between text-purple-700 text-xs font-medium uppercase tracking-wider mb-1">
                                <span>Food Coupons</span>
                                <Utensils className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="text-2xl font-bold text-purple-700">{d2dStats.totalRequestedCoupons}</div>
                            <div className="text-xs text-purple-600 mt-1">Coupons requested</div>
                        </div>
                    </div>

                    {/* Door-to-Door Filter Controls */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search Flat No, Donor, Phone..."
                                    value={d2dSearch}
                                    onChange={(e) => setD2dSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                {/* Tower Selector */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Tower:</span>
                                    <select
                                        value={d2dTower}
                                        onChange={(e) => setD2dTower(e.target.value)}
                                        className="text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Towers</option>
                                        {availableTowers.map(t => (
                                            <option key={t} value={t}>Tower {t}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Floor Selector */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Floor:</span>
                                    <select
                                        value={d2dFloor}
                                        onChange={(e) => setD2dFloor(e.target.value)}
                                        className="text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Floors</option>
                                        {Array.from({ length: 33 }, (_, i) => i + 1).map(floor => (
                                            <option key={floor} value={String(floor)}>Floor {floor}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Selector */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Status:</span>
                                    <select
                                        value={d2dStatus}
                                        onChange={(e) => setD2dStatus(e.target.value as any)}
                                        className="text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Flats</option>
                                        <option value="contributed">Contributed Only</option>
                                        <option value="not_contributed">Not Contributed (Pending)</option>
                                    </select>
                                </div>

                                {(d2dTower !== 'all' || d2dFloor !== 'all' || d2dStatus !== 'all' || d2dSearch) && (
                                    <button
                                        onClick={() => {
                                            setD2dTower('all');
                                            setD2dFloor('all');
                                            setD2dStatus('all');
                                            setD2dSearch('');
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Door-to-Door Roster Table */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <h3 className="text-base font-semibold text-slate-800">
                                    Door-to-Door Collection & Food Coupon Checklist
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Showing flat status and requested food coupons for door collection rounds
                                </p>
                            </div>
                            <div className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                                Total {filteredDoorToDoorData.length} flats ({d2dStats.contributedFlats} contributed, {d2dStats.notContributedFlats} pending)
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-center w-16">Tower</th>
                                        <th className="px-4 py-3 font-semibold text-center w-20">Flat No</th>
                                        <th className="px-4 py-3 font-semibold text-center w-36">Collection Status</th>
                                        <th className="px-4 py-3 font-semibold">Resident / Donor Name</th>
                                        <th className="px-4 py-3 font-semibold">Mobile / Contact</th>
                                        <th className="px-4 py-3 font-semibold text-right">Contributed</th>
                                        <th className="px-4 py-3 font-semibold text-center">Food Coupons</th>
                                        <th className="px-4 py-3 font-semibold text-center">Receipts / Mode</th>
                                        <th className="px-4 py-3 font-semibold text-center w-32">Volunteer Sign</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {paginatedD2dData.length > 0 ? (
                                        paginatedD2dData.map((item, idx) => (
                                            <tr 
                                                key={`${item.towerNumber}-${item.flatNumber}-${idx}`}
                                                className={`transition-colors ${item.hasContributed ? 'bg-emerald-50/10 hover:bg-emerald-50/25' : 'hover:bg-slate-50'}`}
                                            >
                                                {/* Tower */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-slate-700">
                                                    Tower {item.towerNumber}
                                                </td>

                                                {/* Flat */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold text-slate-900">
                                                    {item.flatNumber}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                    {item.hasContributed ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Contributed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                                            Not Contributed
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Resident / Donor Name */}
                                                <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800">
                                                    {item.donorName ? (
                                                        <span>{item.donorName}</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Resident not registered</span>
                                                    )}
                                                </td>

                                                {/* Mobile / Contact */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                                                    {item.mobileNumber || item.donorEmail || (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                {/* Amount */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-right font-semibold text-slate-800">
                                                    {item.hasContributed ? (
                                                        <span className="text-emerald-700">{formatCurrency(item.totalAmount)}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                {/* Food Coupons Requested */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                    {item.hasContributed ? (
                                                        item.totalCoupons > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                                <Utensils className="w-3 h-3 text-purple-600" />
                                                                {item.totalCoupons} Coupons
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">0 Coupons</span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                {/* Receipts / Payment Mode */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs text-slate-600">
                                                    {item.hasContributed ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="font-mono text-blue-600 font-medium">
                                                                {item.receiptNumbers || 'Approved'}
                                                            </span>
                                                            {item.paymentModes && (
                                                                <span className="text-[10px] text-slate-400">({item.paymentModes})</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                {/* Volunteer Signature column */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                    <div className="h-6 border-b border-dashed border-slate-300 mx-auto w-24"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-slate-500">
                                                No flats found matching your selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination for Door-to-Door */}
                        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-t border-slate-200 gap-4 bg-slate-50/50">
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <span>Rows per page:</span>
                                <select
                                    value={d2dRowsPerPage}
                                    onChange={e => setD2dRowsPerPage(Number(e.target.value))}
                                    className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={-1}>All ({filteredDoorToDoorData.length})</option>
                                </select>
                            </div>
                            <div className="text-sm text-slate-600">
                                Showing {paginatedD2dData.length} of {filteredDoorToDoorData.length} flats (Page {d2dRowsPerPage === -1 ? 1 : d2dPage} of {totalD2dPages})
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setD2dPage(prev => Math.max(prev - 1, 1))}
                                    disabled={d2dPage === 1 || d2dRowsPerPage === -1}
                                    className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setD2dPage(prev => Math.min(prev + 1, totalD2dPages))}
                                    disabled={d2dPage === totalD2dPages || totalD2dPages === 0 || d2dRowsPerPage === -1}
                                    className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: INDIVIDUAL RECEIPTS VIEW */}
            {/* ========================================================= */}
            {viewMode === 'receipts' && (
                <ReportContainer 
                    title="Contribution Receipts Report" 
                    onExport={handleExportReceipts}
                    exportButtonText="Export Receipts CSV"
                    extraActions={
                        <button
                            onClick={handleExportDoorToDoor}
                            className="flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-300 px-3.5 py-2 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 text-sm font-medium"
                            title="Export Flat-by-Flat door-to-door collection roster with food coupons"
                        >
                            <Home className="w-4 h-4 mr-2 text-blue-600" />
                            Export Door-to-Door Roster (CSV)
                        </button>
                    }
                >
                    <FilterContainer onReset={() => setReceiptFilters({
                        receiptNo: '',
                        towerNumber: '',
                        flatNumber: '',
                        donorName: '',
                        mobileNumber: '',
                        amountComparator: '>=',
                        amountValue: '',
                        type: '',
                    })}>
                        <TextInput label="Receipt No" value={receiptFilters.receiptNo} onChange={val => setReceiptFilters(prev => ({ ...prev, receiptNo: val }))} placeholder="e.g. REC-CON-00001" />
                        <TextInput label="Tower Number" value={receiptFilters.towerNumber} onChange={val => setReceiptFilters(prev => ({ ...prev, towerNumber: val }))} />
                        <TextInput label="Flat Number" value={receiptFilters.flatNumber} onChange={val => setReceiptFilters(prev => ({ ...prev, flatNumber: val }))} />
                        <TextInput label="Donor Name" value={receiptFilters.donorName} onChange={val => setReceiptFilters(prev => ({ ...prev, donorName: val }))} />
                        <TextInput label="Mobile Number" value={receiptFilters.mobileNumber} onChange={val => setReceiptFilters(prev => ({ ...prev, mobileNumber: val }))} />
                        <AmountInput
                            label="Amount"
                            comparator={receiptFilters.amountComparator}
                            onComparatorChange={val => setReceiptFilters(prev => ({ ...prev, amountComparator: val }))}
                            value={receiptFilters.amountValue}
                            onValueChange={val => setReceiptFilters(prev => ({ ...prev, amountValue: val }))}
                        />
                        <SelectInput 
                            label="Type"
                            value={receiptFilters.type}
                            onChange={val => setReceiptFilters(prev => ({ ...prev, type: val }))}
                            options={[{ value: 'Online', label: 'Online' }, { value: 'Cash', label: 'Cash' }]}
                            placeholder="All Types"
                        />
                    </FilterContainer>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Residence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Food Coupons</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {paginatedContributions.length > 0 ? paginatedContributions.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold font-mono text-blue-700">
                                            {formatReceiptNo(c.id, 'contribution')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.mobileNumber || c.donorEmail || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{`T-${c.towerNumber}, F-${c.flatNumber}`}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{formatCurrency(c.amount)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {c.numberOfCoupons > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                    <Utensils className="w-3 h-3 text-purple-600" />
                                                    {c.numberOfCoupons}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(c.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => openReceipt(c)}
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                                                title="View / Download Printable Receipt"
                                            >
                                                <Receipt className="w-3.5 h-3.5" /> View
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                     <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-500">
                                            {contributions.length === 0 ? "No contributions match the campaign or filters." : "No contributions match your current filters."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 gap-4">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <span>Rows per page:</span>
                            <select
                                value={receiptRowsPerPage}
                                onChange={e => setReceiptRowsPerPage(Number(e.target.value))}
                                className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                aria-label="Rows per page"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-sm text-slate-600" aria-live="polite">
                            Page {totalReceiptPages > 0 ? receiptPage : 0} of {totalReceiptPages} ({filteredContributions.length} items)
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setReceiptPage(prev => Math.max(prev - 1, 1))}
                                disabled={receiptPage === 1}
                                className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Previous page"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setReceiptPage(prev => Math.min(prev + 1, totalReceiptPages))}
                                disabled={receiptPage === totalReceiptPages || totalReceiptPages === 0}
                                className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Next page"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </ReportContainer>
            )}

            <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        </div>
    );
};

export default ContributionReport;
