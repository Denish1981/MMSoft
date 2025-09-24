import React, { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import { GameState, Question, User, UserAnswer, LeaderboardEntry } from './types';
import { startQuiz, submitQuiz, getLeaderboard } from './services/api';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userScore, setUserScore] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (name: string, mobile: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedQuestions = await startQuiz({ name, mobile });
      setUser({ name, mobile });
      setQuestions(fetchedQuestions);
      setGameState('quiz');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFinish = useCallback(async (answers: UserAnswer[], timeTaken: number) => {
    if (!user) return;
    
    try {
      const { score } = await submitQuiz(user, answers, timeTaken);
      setUserScore(score);
      const leaderboardData = await getLeaderboard();
      setLeaderboard(leaderboardData);
      setGameState('leaderboard');
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred submitting your score.");
        }
        // Even if submission fails, show the start screen again
        setGameState('start'); 
    }
  }, [user]);

  const handlePlayAgain = () => {
    setUser(null);
    setQuestions([]);
    setUserScore(null);
    setError(null);
    setLoading(false);
    setGameState('start');
  };

  const renderContent = () => {
    switch (gameState) {
      case 'quiz':
        return user && questions.length > 0 ? (
          <QuizScreen user={user} questions={questions} onFinish={handleFinish} />
        ) : null;
      case 'leaderboard':
        return <LeaderboardScreen leaderboard={leaderboard} userScore={userScore} onPlayAgain={handlePlayAgain} />;
      case 'start':
      default:
        return <StartScreen onStart={handleStart} loading={loading} error={error} />;
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
};

export default App;
