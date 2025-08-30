
export const formatCurrency = (value: number, options: Intl.NumberFormatOptions = {}) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        ...options,
    }).format(value);
};

export const formatUTCDate = (isoString: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        // Add a check for invalid date
        if (isNaN(date.getTime())) {
            return isoString.substring(0, 10);
        }
        return date.toLocaleDateString('en-GB', {
            timeZone: 'UTC',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...options
        });
    } catch (e) {
        return isoString.substring(0, 10); // Fallback for safety
    }
}
