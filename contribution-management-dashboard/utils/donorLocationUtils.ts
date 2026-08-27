export const TOWER_OPTIONS = ['42', '43', '44', '45', '46'];

export const normalizeTowerNumber = (rawTower?: string | number | null): string => {
    if (!rawTower) return '';
    const str = String(rawTower).trim();
    // Strip prefixes like "Tower", "T-", "T ", "T"
    const clean = str.replace(/^(tower|t)[\s-_]*/i, '').trim();
    
    // Map single-digit tower inputs to the society's two-digit tower numbers
    if (clean === '4') return '42';
    if (clean === '2' && !TOWER_OPTIONS.includes('2')) return '42';
    if (clean === '3' && !TOWER_OPTIONS.includes('3')) return '43';
    if (clean === '5' && !TOWER_OPTIONS.includes('5')) return '45';
    if (clean === '6' && !TOWER_OPTIONS.includes('6')) return '46';
    
    return clean;
};

export const normalizeFlatNumber = (rawFlat?: string | number | null): string => {
    if (!rawFlat) return '';
    const str = String(rawFlat).trim();
    // If flat has leading zeros for 3-digit flats (e.g. 0101 -> 101), normalize to standard 101-3313
    if (/^0\d{3}$/.test(str)) {
        return str.replace(/^0+/, '');
    }
    return str;
};

export const getFloorFromFlat = (flatStr: string): number => {
    if (!flatStr) return 1;
    const clean = normalizeFlatNumber(flatStr);
    if (clean.length <= 2) {
        return 1;
    }
    // E.g. '101' -> '1', '1205' -> '12', '3313' -> '33'
    const floorPart = clean.slice(0, clean.length - 2);
    const num = parseInt(floorPart, 10);
    return isNaN(num) || num <= 0 ? 1 : num;
};

export interface FlatOptionGroup {
    floorLabel: string;
    options: string[];
}

export const generateFlatOptions = (): FlatOptionGroup[] => {
    const groups: FlatOptionGroup[] = [];
    for (let floor = 1; floor <= 33; floor++) {
        const options: string[] = [];
        for (let flat = 1; flat <= 13; flat++) {
            const flatSuffix = flat < 10 ? `0${flat}` : `${flat}`;
            const standardFlat = `${floor}${flatSuffix}`;
            options.push(standardFlat);
        }
        groups.push({
            floorLabel: `Floor ${floor}`,
            options
        });
    }
    return groups;
};

export const FLAT_OPTION_GROUPS = generateFlatOptions();
export const ALL_FLAT_OPTIONS = FLAT_OPTION_GROUPS.flatMap(g => g.options);

export const parseTowerAndFlatFromDonorName = (input?: string | null): { towerNumber: string; flatNumber: string } => {
    if (!input || typeof input !== 'string') {
        return { towerNumber: '', flatNumber: '' };
    }
    const trimmed = input.trim();
    if (!trimmed) return { towerNumber: '', flatNumber: '' };

    // 1. Matches patterns with delimiters like "43-2106", "43 - 2106", "T43-2106", "Tower 43 - Flat 2106", "T-43-2106", "43/2106", "43 2106"
    const descriptiveMatch = trimmed.match(/^(?:tower|t)?\s*([a-zA-Z0-9]+)\s*(?:[-/_,\s:]+|flat|f)\s*(?:flat|f)?\s*([a-zA-Z0-9]+)$/i);
    if (descriptiveMatch) {
        const rawTower = descriptiveMatch[1].trim();
        const rawFlat = descriptiveMatch[2].trim();
        return {
            towerNumber: normalizeTowerNumber(rawTower),
            flatNumber: normalizeFlatNumber(rawFlat)
        };
    }

    const parts = trimmed.split(/[-/_:,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
        const rawTower = parts[0].replace(/^(tower|t)/i, '').trim() || parts[0];
        const rawFlat = parts[1].replace(/^(flat|f)/i, '').trim() || parts[1];
        return {
            towerNumber: normalizeTowerNumber(rawTower),
            flatNumber: normalizeFlatNumber(rawFlat)
        };
    }

    // 2. Matches continuous patterns without delimiters like "432106", "T432106", "42101", "421205"
    // Strip leading "Tower", "T-", "T ", "T"
    const cleanWithoutPrefix = trimmed.replace(/^(tower|t)[\s-_]*/i, '').trim();

    // Check against known 2-digit towers (42, 43, 44, 45, 46) followed by 3 or 4 digit flat (e.g. 432106 -> 43 + 2106, 42101 -> 42 + 101)
    for (const tower of TOWER_OPTIONS) {
        if (cleanWithoutPrefix.startsWith(tower) && cleanWithoutPrefix.length > tower.length) {
            const flatPart = cleanWithoutPrefix.slice(tower.length).trim();
            if (/^\d{2,4}$/.test(flatPart)) {
                return {
                    towerNumber: normalizeTowerNumber(tower),
                    flatNumber: normalizeFlatNumber(flatPart)
                };
            }
        }
    }

    // Generic 5 to 6 digit continuous format: 2-digit tower + 3-to-4 digit flat (e.g. 432106 -> 43 and 2106, 42101 -> 42 and 101)
    const genericContinuousMatch = cleanWithoutPrefix.match(/^(\d{2})(\d{3,4})$/);
    if (genericContinuousMatch) {
        return {
            towerNumber: normalizeTowerNumber(genericContinuousMatch[1]),
            flatNumber: normalizeFlatNumber(genericContinuousMatch[2])
        };
    }

    return { towerNumber: '', flatNumber: '' };
};

