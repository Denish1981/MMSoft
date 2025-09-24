export interface Question {
  id: number;
  questionText: string;
  options: string[];
}

export interface UserAnswer {
  questionId: number;
  answer: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  timeTaken: number; // in seconds
}

export interface User {
    name: string;
    mobile: string;
}

export interface Quiz {
  id: number;
  name: string;
  description: string;
  completed?: boolean;
}

export type GameState = 'start' | 'quizSelection' | 'quiz' | 'leaderboard';