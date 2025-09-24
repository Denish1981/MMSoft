import React, { useState, useEffect, useMemo } from 'react';
import { Question, UserAnswer, User } from '../types';
import Spinner from './Spinner';

interface QuizScreenProps {
  user: User;
  questions: Question[];
  onFinish: (answers: UserAnswer[], timeTaken: number) => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ user, questions, onFinish }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTime = useMemo(() => Date.now(), []);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (selectedAnswer) {
      const newAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
      };
      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);
      setSelectedAnswer(null);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Last question answered
        setIsSubmitting(true);
        const endTime = Date.now();
        const timeTaken = Math.round((endTime - startTime) / 1000);
        onFinish(updatedAnswers, timeTaken);
      }
    }
  };
  
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isSubmitting) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 text-center">
            <Spinner />
            <h2 className="text-2xl font-semibold text-gray-300 mt-6">Calculating your score...</h2>
            <p className="text-gray-500">Please wait a moment.</p>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-indigo-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-gray-400">
                Good luck, {user.name}!
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 min-h-[96px]">
            {currentQuestion.questionText}
          </h2>

          <div className="space-y-4">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 text-lg font-medium
                  ${
                    selectedAnswer === option
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-8 text-right">
            <button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
