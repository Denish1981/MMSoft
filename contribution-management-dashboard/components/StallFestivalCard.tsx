import React from 'react';
import { Link } from 'react-router-dom';
import { formatUTCDate } from '../utils/formatting';
import type { Festival as PublicFestival } from '../types/index';

interface StallFestivalCardProps {
    festival: PublicFestival;
}

export const StallFestivalCard: React.FC<StallFestivalCardProps> = ({ festival }) => {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800">{festival.name}</h3>
                 <div className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>🗓️ {formatUTCDate(festival.startDate)} - {formatUTCDate(festival.endDate)}</span>
                </div>
                <p className="mt-4 text-sm text-slate-500 flex-grow">{festival.description}</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                        to={`/festivals/${festival.id}/register-stall`}
                        className="inline-block w-full text-center px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors"
                    >
                        Register for Stall
                    </Link>
                </div>
            </div>
        </div>
    );
};
