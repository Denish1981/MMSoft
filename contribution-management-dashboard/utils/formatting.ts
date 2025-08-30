
export const formatCurrency = (value: number, options: Intl.NumberFormatOptions = {}) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        ...options,
    }).format(value);
};

export const formatUTCDate = (dateString: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) => {
    if (!dateString) return 'N/A';
    try {
        // Handle full ISO strings or 'YYYY-MM-DD' strings by taking just the date part.
        // This ensures dates are always treated as UTC, preventing timezone shifts.
        const datePart = dateString.split('T')[0];
        const parts = datePart.split('-');

        if (parts.length !== 3) {
            // If format is not as expected, return the original string's date part.
            return dateString.substring(0, 10);
        }

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // month is 0-indexed in JS Date
        const day = parseInt(parts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            return dateString.substring(0, 10);
        }

        // Construct a new Date object using UTC values to avoid local timezone interpretation.
        const date = new Date(Date.UTC(year, month, day));

        return date.toLocaleDateString('en-GB', {
            timeZone: 'UTC',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...options
        });
    } catch (e) {
        // Fallback for any unexpected error
        return dateString.substring(0, 10);
    }
};