import React from 'react';
import { CameraIcon } from '../icons/CameraIcon';
import { CloseIcon } from '../icons/CloseIcon';

interface ImageUploadSectionProps {
    imagePreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenCamera: () => void;
    onClearImage: () => void;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    imagePreview,
    onFileChange,
    onOpenCamera,
    onClearImage,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700">Image (Optional)</label>
            <div className="mt-2 grid grid-cols-2 gap-4">
                <label htmlFor="imageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                    Upload File
                    <input id="imageUpload" type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
                </label>
                <button type="button" onClick={onOpenCamera} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Capture Image
                </button>
            </div>
            {imagePreview && (
                <div className="mt-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Image Preview:</p>
                    <div className="relative inline-block">
                        <img src={imagePreview} alt="Contribution preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                        <button type="button" onClick={onClearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
