import React, { useRef } from 'react';
import { CameraIcon } from '../icons/CameraIcon';
import { CloseIcon } from '../icons/CloseIcon';

interface ImageUploadSectionProps {
    imagePreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenCamera: () => void;
    onClearImage: () => void;
    required?: boolean;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    imagePreview,
    onFileChange,
    onOpenCamera,
    onClearImage,
    required = true,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700">
                Receipt / Payment Proof {required ? <span className="text-rose-600 font-bold">*</span> : '(Optional)'}
            </label>
            {!imagePreview && required && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                    * Payment proof or receipt image is mandatory to submit a contribution.
                </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3">
                <label
                    htmlFor="contributionImageUpload"
                    className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                    📁 Upload File
                </label>
                <input
                    id="contributionImageUpload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={onOpenCamera}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-700 hover:bg-slate-800"
                >
                    <CameraIcon className="w-5 h-5 mr-1.5" />
                    Capture Image
                </button>
            </div>
            {imagePreview && (
                <div className="mt-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Image Preview:</p>
                    <div className="relative inline-block">
                        <img src={imagePreview} alt="Contribution proof preview" className="max-h-40 rounded-md border border-slate-200 p-1 object-contain bg-slate-50" />
                        <button
                            type="button"
                            onClick={() => {
                                onClearImage();
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                            title="Remove image"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
