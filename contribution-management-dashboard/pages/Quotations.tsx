

import React, { useMemo, useState } from 'react';
import type { Quotation, Vendor, Festival } from '../types';
import { CloseIcon } from '../components/icons/CloseIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { formatCurrency } from '../utils/formatting';
import FinanceNavigation from '../components/FinanceNavigation';

interface QuotationsProps {
    quotations: Quotation[];
    vendors: Vendor[];
    festivals: Festival[];
    onEdit: (quotation: Quotation) => void;
    onDelete: (id: number) => void;
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

const ImageViewerModal: React.FC<{ images: string[], onClose: () => void }> = ({ images, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstImage = currentIndex === 0;
        const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastImage = currentIndex === images.length - 1;
        const newIndex = isLastImage ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100]" 
            onClick={onClose}
        >
             <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-slate-300 z-20">
                <CloseIcon className="w-8 h-8" />
            </button>
            {images.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                    >
                        &lt;
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                    >
                        &gt;
                    </button>
                </>
            )}
            <div className="relative p-4" onClick={e => e.stopPropagation()}>
                <img src={images[currentIndex]} alt={`Quotation image ${currentIndex + 1}`} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
                 {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
};

const Quotations: React.FC<QuotationsProps> = ({ quotations, vendors, festivals, onEdit, onDelete, onViewHistory }) => {
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);
    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    return (
        <div className="space-y-6">
            <FinanceNavigation />
            {viewingImages && (
                <ImageViewerModal images={viewingImages} onClose={() => setViewingImages(null)} />
            )}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quotation For</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Associated Festival</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Images</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {quotations.map(quote => (
                                <tr key={quote.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{quote.quotationFor}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(quote.vendorId) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(quote.festivalId && festivalMap.get(quote.festivalId)) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(quote.cost)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(quote.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {quote.quotationImages && quote.quotationImages.length > 0 ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                {quote.quotationImages.slice(0, 3).map((image, index) => (
                                                    <img 
                                                        key={index}
                                                        src={image} 
                                                        alt={`Thumbnail ${index + 1}`}
                                                        className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform"
                                                        onClick={() => setViewingImages(quote.quotationImages)}
                                                    />
                                                ))}
                                                {quote.quotationImages.length > 3 && (
                                                    <div className="flex items-center justify-center h-10 w-16 bg-slate-200 text-slate-600 font-bold text-sm rounded-md">
                                                        +{quote.quotationImages.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => onViewHistory('quotations', quote.id, `History for ${quote.quotationFor}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onEdit(quote)} className="text-slate-600 hover:text-slate-900" title="Edit Quotation">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDelete(quote.id)} className="text-red-600 hover:text-red-900" title="Delete Quotation">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Quotations;