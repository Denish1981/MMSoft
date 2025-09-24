import { Question, LeaderboardEntry, UserAnswer, User, Quiz } from '../types';

const API_BASE_URL = '/api'; // Assumes a proxy is set up to the backend server

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred with the API');
  }
  return data;
};

export const getQuizzes = async (mobile: string): Promise<Quiz[]> => {
  const response = await fetch(`${API_BASE_URL}/quizzes?mobile=${mobile}`);
  return handleResponse(response);
};

export const startQuiz = async (user: User, quizId: number): Promise<Question[]> => {
  const response = await fetch(`${API_BASE_URL}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user, quizId }),
  });
  return handleResponse(response);
};

export const submitQuiz = async (user: User, answers: UserAnswer[], timeTaken: number, quizId: number): Promise<{ score: number }> => {
    const response = await fetch(`${API_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user, answers, timeTaken, quizId }),
  });
  return handleResponse(response);
};

export const getLeaderboard = async (quizId: number): Promise<LeaderboardEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/leaderboard/${quizId}`);
  return handleResponse(response);
};