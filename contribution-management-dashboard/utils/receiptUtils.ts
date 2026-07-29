import { formatCurrency, formatUTCDate } from './formatting';

export type ReceiptCategory = 'contribution' | 'misc' | 'sponsor' | 'stall';

export interface ReceiptData {
    receiptNo: string;
    category: ReceiptCategory;
    title: string;
    date: string;
    payerName: string;
    payerEmail?: string;
    payerPhone?: string;
    towerNumber?: string;
    flatNumber?: string;
    amount: number;
    paymentMode?: string | null;
    festivalOrCampaign?: string;
    status: string;
    details?: Array<{ label: string; value: string }>;
}

export const formatReceiptNo = (id: number | string, category: ReceiptCategory | string): string => {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return String(id);
    
    const padded = String(numericId).padStart(5, '0');
    const catLower = String(category).toLowerCase();

    if (catLower === 'sponsor' || catLower === 'spn') {
        return `REC-SPN-${padded}`;
    } else if (catLower === 'stall' || catLower === 'stl') {
        return `REC-STL-${padded}`;
    } else if (catLower === 'misc' || catLower === 'mis' || catLower === 'miscellaneous') {
        return `REC-MIS-${padded}`;
    } else {
        return `REC-CON-${padded}`;
    }
};

export const numberToWordsRupees = (num: number): string => {
    if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n: number): string {
        if (n < 20) return a[n];
        const digit = n % 10;
        if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? inWords(n % 10000000) : '');
    }

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let str = inWords(whole).trim() + ' Rupees';
    if (fraction > 0) {
        str += ' and ' + inWords(fraction).trim() + ' Paise';
    }
    return str + ' Only';
};

export const matchesReceiptFilter = (id: number | string, category: ReceiptCategory | string, searchFilter: string): boolean => {
    if (!searchFilter || !searchFilter.trim()) return true;
    const term = searchFilter.trim().toLowerCase();
    const formatted = formatReceiptNo(id, category).toLowerCase();
    const rawIdStr = String(id).toLowerCase();
    return formatted.includes(term) || rawIdStr.includes(term);
};
