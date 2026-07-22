import React from 'react';

interface DocStepItemProps {
    num: number;
    title: string;
    desc: string | React.ReactNode;
}

export const DocStepItem: React.FC<DocStepItemProps> = ({ num, title, desc }) => (
    <div className="flex gap-4 items-start py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
            {num}
        </div>
        <div>
            <h4 className="font-semibold text-slate-800 text-base">{title}</h4>
            <div className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{desc}</div>
        </div>
    </div>
);
