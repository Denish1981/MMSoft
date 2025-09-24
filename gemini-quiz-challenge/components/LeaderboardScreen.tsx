import React from 'react';
import { LeaderboardEntry } from '../types';
import TrophyIcon from './icons/TrophyIcon';
import ClockIcon from './icons/ClockIcon';

interface LeaderboardScreenProps {
  leaderboard: LeaderboardEntry[];
  onPlayAgain: () => void;
  userScore: number | null;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ leaderboard, onPlayAgain, userScore }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all duration-300">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
            Leaderboard
          </h1>
          {userScore !== null && (
            <p className="text-xl text-gray-300">
              You scored <span className="font-bold text-white">{userScore}/5</span>!
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-700">
          <div className="bg-gray-900/50 px-6 py-4 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Rank</div>
            <div className="col-span-5">Name</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-3 text-right">Time</div>
          </div>
          <ul className="divide-y divide-gray-700">
            {leaderboard.map((entry) => (
              <li key={entry.rank} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-700/50 transition-colors">
                <div className="col-span-2 flex items-center font-bold text-lg">
                  <TrophyIcon rank={entry.rank} className="mr-3"/>
                  <span>{entry.rank}</span>
                </div>
                <div className="col-span-5 text-gray-200 font-medium">{entry.name}</div>
                <div className="col-span-2 text-center text-lg font-semibold text-indigo-400">{entry.score}</div>
                <div className="col-span-3 flex items-center justify-end text-gray-400">
                  <ClockIcon className="mr-1.5" />
                  {entry.timeTaken}s
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-center mt-6">
            <button
              onClick={onPlayAgain}
              className="w-full md:w-auto py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-300"
            >
              Play Again
            </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardScreen;
