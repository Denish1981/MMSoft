import React from 'react';
import { User, Phone, Mail, Building2, Users, ArrowRight } from 'lucide-react';
import { PrimaryContactData, RosterMember } from './types';
import { useNavigate } from 'react-router-dom';

interface PrimaryContactSectionProps {
    contactData: PrimaryContactData;
    onChange: (field: keyof PrimaryContactData, value: string) => void;
    familyRoster: RosterMember[];
    isLoggedIn: boolean;
}

export const PrimaryContactSection: React.FC<PrimaryContactSectionProps> = ({
    contactData,
    onChange,
    familyRoster,
    isLoggedIn
}) => {
    const navigate = useNavigate();
    const savedCount = familyRoster.filter(m => m.name.trim() !== '').length;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" /> Primary Resident Details
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Your contact information will be recorded as the primary point of contact for all selected event registrations.
                    </p>
                </div>

                {isLoggedIn && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200/60 shrink-0">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                            Household Roster: <strong>{savedCount} member{savedCount !== 1 ? 's' : ''} saved</strong>
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/donor-portal')}
                            className="text-blue-700 font-bold hover:underline flex items-center gap-0.5 ml-1"
                            title="Manage Household Roster in Donor Portal"
                        >
                            Manage <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Primary Resident Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            required
                            value={contactData.fullName}
                            onChange={(e) => onChange('fullName', e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="tel"
                            required
                            value={contactData.contactNumber}
                            onChange={(e) => onChange('contactNumber', e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="email"
                            value={contactData.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="e.g. rahul@example.com"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tower Number / Block
                    </label>
                    <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={contactData.towerNumber}
                            onChange={(e) => onChange('towerNumber', e.target.value)}
                            placeholder="e.g. Tower A"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Flat Number / Door
                    </label>
                    <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={contactData.flatNumber}
                            onChange={(e) => onChange('flatNumber', e.target.value)}
                            placeholder="e.g. 1204"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
