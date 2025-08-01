
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatting';

interface ChartData {
    name: string;
    contributions: number;
}

interface AreaChartComponentProps {
    data: ChartData[];
}

const AreaChartComponent: React.FC<AreaChartComponentProps> = ({ data }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md h-96">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Contributions Over Time</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                        <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickFormatter={(value) => formatCurrency(value as number, { notation: 'compact', maximumFractionDigits: 1 })}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '0.5rem' 
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                      formatter={(value: number) => [formatCurrency(value), 'Contributions']}
                    />
                    <Area type="monotone" dataKey="contributions" name="Contributions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorContributions)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AreaChartComponent;
