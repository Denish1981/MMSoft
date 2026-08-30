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

/**
 * Checks if a contribution or donor's tower & flat numbers match a search query.
 * Supports various query formats:
 * - Continuous: 421105, 420704, 42704
 * - Delimited: 42-1105, 42-704, 42-0704, 42 1105, 42/1105, 42 704
 * - With prefixes: T42-1105, Tower 42-1105, T420704
 * - Partial: 42, 1105, 704, 0704
 */
export const matchesTowerFlatFilter = (
    rawTower?: string | number | null,
    rawFlat?: string | number | null,
    filterInput?: string
): boolean => {
    if (!filterInput || !filterInput.trim()) return true;

    const towerStr = String(rawTower || '').trim();
    const flatStr = String(rawFlat || '').trim();
    const normTower = normalizeTowerNumber(towerStr);
    const normFlat = normalizeFlatNumber(flatStr);

    if (!towerStr && !flatStr && !normTower && !normFlat) return false;

    const filter = filterInput.trim().toLowerCase();
    const cleanFilterAlphanumeric = filter.replace(/[^a-z0-9]/g, '');

    // Collect variations of flat (e.g. 704, 0704, 0101, 101)
    const flatVariations = new Set<string>();
    if (flatStr) {
        flatVariations.add(flatStr.toLowerCase());
        flatVariations.add(flatStr.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (normFlat) {
        flatVariations.add(normFlat.toLowerCase());
        // If normFlat is 3 digits like '704', 4-digit padded floor format is '0704'
        if (/^\d{3}$/.test(normFlat)) {
            flatVariations.add(`0${normFlat}`);
        }
        // If normFlat is 1-2 digits like '5', padded formats
        if (/^\d{1,2}$/.test(normFlat)) {
            flatVariations.add(normFlat.padStart(3, '0'));
            flatVariations.add(normFlat.padStart(4, '0'));
        }
    }

    // Collect variations of tower (e.g. 42, tower 42, t42)
    const towerVariations = new Set<string>();
    if (towerStr) {
        towerVariations.add(towerStr.toLowerCase());
        towerVariations.add(towerStr.toLowerCase().replace(/^(tower|t)[\s-_]*/i, ''));
    }
    if (normTower) {
        towerVariations.add(normTower.toLowerCase());
    }

    // Check parsed query
    const parsed = parseTowerAndFlatFromDonorName(filter);
    if (parsed.towerNumber && parsed.flatNumber) {
        const pTower = parsed.towerNumber.toLowerCase();
        const pFlat = parsed.flatNumber.toLowerCase();
        const towerMatches = Array.from(towerVariations).some(t => t === pTower || t.includes(pTower));
        const flatMatches = Array.from(flatVariations).some(f => f === pFlat || normalizeFlatNumber(f) === normalizeFlatNumber(pFlat));
        if (towerMatches && flatMatches) {
            return true;
        }
    }

    // Build combination strings
    const comboVariations = new Set<string>();
    towerVariations.forEach(t => {
        if (!t) return;
        flatVariations.forEach(f => {
            if (!f) return;
            comboVariations.add(`${t}-${f}`);
            comboVariations.add(`${t} - ${f}`);
            comboVariations.add(`${t} ${f}`);
            comboVariations.add(`${t}/${f}`);
            comboVariations.add(`${t}${f}`);
            comboVariations.add(`t${t}-${f}`);
            comboVariations.add(`t${t}${f}`);
            comboVariations.add(`t-${t}-${f}`);
            comboVariations.add(`tower ${t} flat ${f}`);
            comboVariations.add(`tower ${t} ${f}`);
            comboVariations.add(`tower${t}flat${f}`);
        });
    });

    // Check substring match in combinations
    for (const combo of comboVariations) {
        if (combo.includes(filter)) return true;
        const comboAlphanumeric = combo.replace(/[^a-z0-9]/g, '');
        if (cleanFilterAlphanumeric && comboAlphanumeric.includes(cleanFilterAlphanumeric)) {
            return true;
        }
    }

    // If search filter matches just tower alone
    for (const t of towerVariations) {
        if (t === filter || t.includes(filter) || (cleanFilterAlphanumeric && t.replace(/[^a-z0-9]/g, '') === cleanFilterAlphanumeric)) {
            return true;
        }
    }

    // If search filter matches just flat alone
    for (const f of flatVariations) {
        if (f === filter || f.includes(filter) || (cleanFilterAlphanumeric && f.replace(/[^a-z0-9]/g, '') === cleanFilterAlphanumeric)) {
            return true;
        }
    }

    return false;
};

