import React from 'react';

interface PersonalDetailsSectionProps {
    registrantName: string;
    setRegistrantName: (val: string) => void;
    contactNumber: string;
    setContactNumber: (val: string) => void;
}

export const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({
    registrantName,
    setRegistrantName,
    contactNumber,
    setContactNumber,
}) => {
    return (
        <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-700 mb-2">Your Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="registrantName" className="block text-sm font-medium text-slate-700">Full Name *</label>
                    <input type="text" id="registrantName" value={registrantName} onChange={e => setRegistrantName(e.target.value)} className="mt-1 block w-full input-style" />
                </div>
                <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">Contact Number *</label>
                    <input type="tel" id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="mt-1 block w-full input-style" />
                </div>
            </div>
        </fieldset>
    );
};
