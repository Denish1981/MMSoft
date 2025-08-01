import React, { useRef, useEffect, useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';

interface CameraCaptureProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access camera. Please ensure permissions are granted and there is no other app using it.");
            }
        };
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCaptureClick = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
            onCapture(imageDataUrl);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]">
            <div className="bg-white rounded-lg shadow-2xl p-4 w-full max-w-xl m-4 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-slate-800 z-10">
                    <CloseIcon className="w-8 h-8" />
                </button>
                <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Capture Photo</h2>
                {error ? (
                    <div className="text-red-600 bg-red-50 p-4 rounded-md">{error}</div>
                ) : (
                    <>
                        <div className="bg-slate-900 rounded-md overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="mt-4 flex justify-center">
                            <button onClick={handleCaptureClick} className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                                <CameraIcon className="w-6 h-6 mr-2" />
                                Capture Photo
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CameraCapture;