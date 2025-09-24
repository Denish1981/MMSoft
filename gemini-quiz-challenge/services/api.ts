import { Question, LeaderboardEntry, UserAnswer, User } from '../types';

const API_BASE_URL = '/api'; // Assumes a proxy is set up to the backend server

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred with the API');
  }
  return data;
};

export const startQuiz = async (user: User): Promise<Question[]> => {
  const response = await fetch(`${API_BASE_URL}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
};

export const submitQuiz = async (user: User, answers: UserAnswer[], timeTaken: number): Promise<{ score: number }> => {
    const response = await fetch(`${API_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user, answers, timeTaken }),
  });
  return handleResponse(response);
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/leaderboard`);
  return handleResponse(response);
};
