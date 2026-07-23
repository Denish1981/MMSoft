import React from 'react';

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
                    {isMiscellaneous ? 'Name / Source' : 'Donor Name'}
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
                    <label htmlFor="donorEmail" className="block text-sm font-medium text-slate-700">Donor Email (Optional)</label>
                    <input 
                        type="email" 
                        id="donorEmail" 
                        value={donorEmail} 
                        onChange={e => setDonorEmail(e.target.value)} 
                        className={baseInputClass} 
                    />
                </div>
                <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700">Mobile Number (Optional)</label>
                    <input 
                        type="tel" 
                        id="mobileNumber" 
                        value={mobileNumber} 
                        onChange={e => setMobileNumber(e.target.value)} 
                        className={baseInputClass} 
                    />
                </div>
            </div>
            {!isMiscellaneous && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="towerNumber" className="block text-sm font-medium text-slate-700">Tower Number</label>
                        <input 
                            type="text" 
                            id="towerNumber" 
                            value={towerNumber} 
                            onChange={e => setTowerNumber(e.target.value)} 
                            disabled={disabledTowerNumber}
                            readOnly={disabledTowerNumber}
                            className={`${baseInputClass} ${disabledTowerNumber ? disabledInputClass : ''}`} 
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="flatNumber" className="block text-sm font-medium text-slate-700">Flat Number</label>
                        <input 
                            type="text" 
                            id="flatNumber" 
                            value={flatNumber} 
                            onChange={e => setFlatNumber(e.target.value)} 
                            disabled={disabledFlatNumber}
                            readOnly={disabledFlatNumber}
                            className={`${baseInputClass} ${disabledFlatNumber ? disabledInputClass : ''}`} 
                            required 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
