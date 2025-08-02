
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';
import { SwitchCameraIcon } from './icons/SwitchCameraIcon';

interface CameraCaptureProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
    const [isFrontCamera, setIsFrontCamera] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Get permission first to get device labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(track => track.stop());

                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0) {
                    const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
                    setCurrentDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
                } else {
                    setError("No camera devices found.");
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error enumerating devices:", err);
                setError("Could not access camera. Please ensure permissions are granted.");
                setIsLoading(false);
            }
        };
        getDevices();
        return stopStream;
    }, [stopStream]);

    useEffect(() => {
        if (currentDeviceId) {
            let mounted = true;
            const startCamera = async () => {
                stopStream();
                setIsLoading(true);
                setError(null);
                try {
                    const constraints: MediaStreamConstraints = {
                        video: { deviceId: { exact: currentDeviceId } }
                    };
                    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    if (mounted) {
                        const videoTrack = mediaStream.getVideoTracks()[0];
                        const settings = videoTrack.getSettings();
                        setIsFrontCamera(settings.facingMode === 'user');
                        
                        streamRef.current = mediaStream;
                        if (videoRef.current) {
                            videoRef.current.srcObject = mediaStream;
                        }
                        setIsLoading(false);
                    } else {
                        mediaStream.getTracks().forEach(track => track.stop());
                    }
                } catch (err) {
                    console.error("Error starting camera:", err);
                    if(mounted) {
                        setError("Could not start camera. It might be in use by another application.");
                        setIsLoading(false);
                    }
                }
            };
            startCamera();
            return () => { mounted = false; };
        }
    }, [currentDeviceId, stopStream]);

    const handleSwitchCamera = () => {
        if (devices.length > 1 && currentDeviceId) {
            const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            setCurrentDeviceId(devices[nextIndex].deviceId);
        }
    };

    const handleCaptureClick = () => {
        if (videoRef.current && canvasRef.current && streamRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if(!context) return;
            
            if (isFrontCamera) {
                context.translate(video.videoWidth, 0);
                context.scale(-1, 1);
            }

            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            onCapture(imageDataUrl);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]">
            <div className="bg-white rounded-lg shadow-2xl p-4 w-full max-w-xl m-4 relative">
                <div className="absolute top-2 right-2 z-20 flex items-center space-x-2">
                    {devices.length > 1 && (
                        <button onClick={handleSwitchCamera} className="text-white hover:text-slate-300 p-2 bg-black/30 rounded-full" aria-label="Switch Camera">
                            <SwitchCameraIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button onClick={onClose} className="text-white hover:text-slate-300 p-2 bg-black/30 rounded-full" aria-label="Close Camera">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="bg-slate-900 rounded-md overflow-hidden relative aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${isFrontCamera ? 'transform scale-x-[-1]' : ''} ${isLoading || error ? 'hidden' : 'block'}`} />
                    <canvas ref={canvasRef} className="hidden" />
                    {isLoading && <p className="text-white absolute">Starting camera...</p>}
                    {error && <p className="text-red-400 text-center p-4 absolute">{error}</p>}
                </div>

                <div className="mt-4 flex justify-center">
                    <button onClick={handleCaptureClick} disabled={isLoading || !!error} className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-full shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed">
                        <CameraIcon className="w-6 h-6 mr-2" />
                        <span className="text-lg font-semibold">Capture</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default CameraCapture;
