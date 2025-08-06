
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatting';

interface ChartData {
    name: string;
    [key: string]: any;
}

interface AreaChartComponentProps {
    data: ChartData[];
    title: string;
    dataKey: string;
    strokeColor: string;
    gradientId: string;
    gradientColor: string;
    gradientOpacity: number;
    tooltipLabel: string;
}

const AreaChartComponent: React.FC<AreaChartComponentProps> = ({ 
    data, 
    title, 
    dataKey,
    strokeColor, 
    gradientId,
    gradientColor,
    gradientOpacity,
    tooltipLabel 
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md h-96">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={gradientOpacity} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
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
                      formatter={(value: number) => [formatCurrency(value), tooltipLabel]}
                    />
                    <Area type="monotone" dataKey={dataKey} name={tooltipLabel} stroke={strokeColor} fillOpacity={1} fill={`url(#${gradientId})`} strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AreaChartComponent;