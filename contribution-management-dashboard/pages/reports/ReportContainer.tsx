
import React from 'react';

interface ReportContainerProps {
    title: string;
    onExport: () => void;
    children: React.ReactNode;
}

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);


const ReportContainer: React.FC<ReportContainerProps> = ({ title, onExport, children }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
                <button
                    onClick={onExport}
                    className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                    <ExportIcon className="w-5 h-5 mr-2" />
                    Export to CSV
                </button>
            </div>
            {children}
        </div>
    );
};

export default ReportContainer;
