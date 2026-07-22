import React from 'react';
import { CashIcon } from '../icons/CashIcon';
import { formatCurrency } from '../../utils/formatting';

interface CarryForwardBalanceWidgetProps {
    carryForwardBalance: number;
}

export const CarryForwardBalanceWidget: React.FC<CarryForwardBalanceWidgetProps> = ({
    carryForwardBalance,
}) => {
    return (
        <div className={`p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${carryForwardBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} border`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center">
                    <div className={`${carryForwardBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} p-4 rounded-full mr-4 shadow-sm`}>
                        <CashIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Carry Forward Balance</h3>
                        <p className="text-sm text-slate-500 font-medium">
                            {carryForwardBalance >= 0 
                                ? 'Surplus funds available to be carried forward' 
                                : 'Net deficit for the selected period'}
                        </p>
                    </div>
                </div>
                <div className="text-center md:text-right px-4 py-2 rounded-lg bg-white/50 border border-white/50 backdrop-blur-sm shadow-inner min-w-[200px]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Estimated Balance</p>
                    <p className={`text-4xl font-extrabold tracking-tight ${carryForwardBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(carryForwardBalance)}
                    </p>
                </div>
            </div>
        </div>
    );
};
