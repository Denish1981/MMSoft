import React from 'react';
import { TOWER_OPTIONS, FLAT_OPTION_GROUPS, ALL_FLAT_OPTIONS } from '../../utils/donorLocationUtils';

interface DonorFieldsProps {
    donorName: string;
    setDonorName: (val: string) => void;
    donorEmail: string;
    setDonorEmail: (val: string) => void;
    mobileNumber: string;
    setMobileNumber: (val: string) => void;
    towerNumber: string;
    setTowerNumber: (val: string) => void;
    flatNumber: string;
    setFlatNumber: (val: string) => void;
    isMiscellaneous: boolean;
    disabledDonorName?: boolean;
    disabledTowerNumber?: boolean;
    disabledFlatNumber?: boolean;
}

export const DonorFields: React.FC<DonorFieldsProps> = ({
    donorName,
    setDonorName,
    donorEmail,
    setDonorEmail,
    mobileNumber,
    setMobileNumber,
    towerNumber,
    setTowerNumber,
    flatNumber,
    setFlatNumber,
    isMiscellaneous,
    disabledDonorName = false,
    disabledTowerNumber = false,
    disabledFlatNumber = false,
}) => {
    const baseInputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    const disabledInputClass = "bg-slate-100 text-slate-600 cursor-not-allowed";

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="donorName" className="block text-sm font-medium text-slate-700">
                    {isMiscellaneous ? 'Name / Source *' : 'Donor Name *'}
                </label>
                <input 
                    type="text" 
                    id="donorName" 
                    value={donorName} 
                    onChange={e => setDonorName(e.target.value)} 
                    disabled={disabledDonorName}
                    readOnly={disabledDonorName}
                    className={`${baseInputClass} ${disabledDonorName ? disabledInputClass : ''}`} 
                    required 
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="donorEmail" className="block text-sm font-medium text-slate-700">Donor Email *</label>
                    <input 
                        type="email" 
                        id="donorEmail" 
                        value={donorEmail} 
                        onChange={e => setDonorEmail(e.target.value)} 
                        className={baseInputClass} 
                        required
                    />
                </div>
                <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700">Mobile Number *</label>
                    <input 
                        type="tel" 
                        id="mobileNumber" 
                        value={mobileNumber} 
                        onChange={e => setMobileNumber(e.target.value)} 
                        className={baseInputClass} 
                        required
                    />
                </div>
            </div>
            {!isMiscellaneous && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="towerNumber" className="block text-sm font-medium text-slate-700">Tower Number *</label>
                        <select 
                            id="towerNumber" 
                            value={towerNumber} 
                            onChange={e => setTowerNumber(e.target.value)} 
                            disabled={disabledTowerNumber}
                            className={`${baseInputClass} ${disabledTowerNumber ? disabledInputClass : 'bg-white'}`} 
                            required 
                        >
                            <option value="">Select Tower *</option>
                            {TOWER_OPTIONS.map(tower => (
                                <option key={tower} value={tower}>{tower}</option>
                            ))}
                            {towerNumber && !TOWER_OPTIONS.includes(towerNumber) && (
                                <option value={towerNumber}>{towerNumber}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="flatNumber" className="block text-sm font-medium text-slate-700">Flat Number *</label>
                        <select 
                            id="flatNumber" 
                            value={flatNumber} 
                            onChange={e => setFlatNumber(e.target.value)} 
                            disabled={disabledFlatNumber}
                            className={`${baseInputClass} ${disabledFlatNumber ? disabledInputClass : 'bg-white'}`} 
                            required 
                        >
                            <option value="">Select Flat *</option>
                            {FLAT_OPTION_GROUPS.map(group => (
                                <optgroup key={group.floorLabel} label={group.floorLabel}>
                                    {group.options.map(flat => (
                                        <option key={flat} value={flat}>{flat}</option>
                                    ))}
                                </optgroup>
                            ))}
                            {flatNumber && !ALL_FLAT_OPTIONS.includes(flatNumber) && (
                                <option value={flatNumber}>{flatNumber}</option>
                            )}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
