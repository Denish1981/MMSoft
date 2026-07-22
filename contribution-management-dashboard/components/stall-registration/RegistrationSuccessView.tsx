import React from 'react';

interface RegistrationSuccessViewProps {
    onBackToHome: () => void;
}

export const RegistrationSuccessView: React.FC<RegistrationSuccessViewProps> = ({ onBackToHome }) => {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
             <div className="p-8 text-center bg-white rounded-lg shadow-xl max-w-lg">
                <h3 className="text-2xl font-bold text-green-600">Registration Submitted!</h3>
                <p className="mt-2 text-slate-600">Thank you for registering for a stall. We will review your submission and be in touch shortly.</p>
                <button onClick={onBackToHome} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Back to Home</button>
            </div>
        </div>
    );
};
