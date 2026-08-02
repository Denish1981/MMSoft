export const TOWER_OPTIONS = ['42', '43', '44', '45', '46'];

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
            
            // // For single-digit floors (1-9), also include leading zero format e.g. '0101'
            // if (floor < 10) {
            //     const zeroPaddedFlat = `0${floor}${flatSuffix}`;
            //     if (!options.includes(zeroPaddedFlat)) {
            //         options.push(zeroPaddedFlat);
            //     }
            // }
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
