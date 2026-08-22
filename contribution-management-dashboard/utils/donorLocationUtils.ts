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

