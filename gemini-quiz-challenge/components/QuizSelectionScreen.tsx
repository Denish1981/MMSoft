import React from 'react';
import { Quiz } from '../types';
import Spinner from './Spinner';

interface QuizSelectionScreenProps {
  userName: string;
  quizzes: Quiz[];
  onSelectQuiz: (quizId: number) => void;
  onViewLeaderboard: (quizId: number) => void;
  loading: boolean;
  error: string | null;
}

const QuizSelectionScreen: React.FC<QuizSelectionScreenProps> = ({ userName, quizzes, onSelectQuiz, onViewLeaderboard, loading, error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
          Choose Your Challenge
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Welcome, {userName}! Select a quiz below to get started.</p>

        <div className="mt-8">
          {loading && <Spinner />}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
            </div>
          )}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 transition-all duration-300 text-left space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white">{quiz.name}</h2>
                    <p className="text-gray-400 mt-2">{quiz.description}</p>
                  </div>
                  <div className="flex items-center justify-end gap-4 mt-4">
                      <button
                          onClick={() => onViewLeaderboard(quiz.id)}
                          className="py-2 px-4 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-300"
                      >
                          View Leaderboard
                      </button>
                      <button
                          onClick={() => onSelectQuiz(quiz.id)}
                          disabled={quiz.completed}
                          className="py-2 px-5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                          {quiz.completed ? 'Completed' : 'Start Quiz'}
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizSelectionScreen;