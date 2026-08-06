import React from 'react';
import { CheckCircle2, ArrowLeft, Layers, Calendar, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RegistrationSuccessViewProps {
    registeredEventSummary: { name: string; count: number }[];
    onReset: () => void;
}

export const RegistrationSuccessView: React.FC<RegistrationSuccessViewProps> = ({
    registeredEventSummary,
    onReset
}) => {
    const navigate = useNavigate();

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl text-center space-y-6 my-8 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Registration Successful!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Your multi-event registrations have been recorded in the database.
                </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Summary of Registered Events
                </h4>
                <div className="divide-y divide-slate-200/60">
                    {registeredEventSummary.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-800">{item.name}</span>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                {item.count} Participant{item.count !== 1 ? 's' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                    onClick={() => navigate('/donor-portal')}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                    <Layers className="w-4 h-4" /> Go to Donor Portal
                </button>
                <button
                    onClick={onReset}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                    Register for More Events
                </button>
            </div>
        </div>
    );
};
