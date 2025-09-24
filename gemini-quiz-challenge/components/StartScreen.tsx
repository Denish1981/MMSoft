import React, { useState } from 'react';
import Spinner from './Spinner';

interface StartScreenProps {
  onStart: (name: string, mobile: string) => void;
  loading: boolean;
  error: string | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, loading, error }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setFormError('Name must be at least 2 characters long.');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setFormError('');
    onStart(name, mobile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all hover:scale-105 duration-300">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
            Gemini Quiz Challenge
          </h1>
          <p className="text-gray-400 mt-2">Enter your details to begin the challenge!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-gray-300">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex Ray"
              disabled={loading}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="mobile" className="text-sm font-medium text-gray-300">Mobile Number</label>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number"
              disabled={loading}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
          </div>
          
          {(error || formError) && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm">
                {error || formError}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? <Spinner /> : 'Start Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartScreen;
