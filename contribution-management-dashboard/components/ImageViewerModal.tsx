import React from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ImageViewerModalProps {
    imageUrl: string;
    onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" onClick={onClose}>
        <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Full size view" className="max-w-full max-h-[85vh] object-contain" />
             <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-slate-800 rounded-full p-2">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
);

export default ImageViewerModal;
