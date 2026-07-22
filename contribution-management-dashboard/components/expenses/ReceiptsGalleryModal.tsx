import React, { useState } from 'react';
import { CloseIcon } from '../icons/CloseIcon';

interface ReceiptsGalleryModalProps {
    images: string[];
    onClose: () => void;
}

export const ReceiptsGalleryModal: React.FC<ReceiptsGalleryModalProps> = ({ images, onClose }) => {
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
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-slate-300 z-20" aria-label="Close modal">
                <CloseIcon className="w-8 h-8" />
            </button>
            {images.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                        aria-label="Previous image"
                    >
                        &lt;
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                        aria-label="Next image"
                    >
                        &gt;
                    </button>
                </>
            )}
            <div className="relative p-4" onClick={e => e.stopPropagation()}>
                <img src={images[currentIndex]} alt={`Receipt image ${currentIndex + 1}`} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
};
