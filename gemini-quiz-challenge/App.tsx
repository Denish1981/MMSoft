import React, { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import QuizSelectionScreen from './components/QuizSelectionScreen';
import { GameState, Question, User, UserAnswer, LeaderboardEntry, Quiz } from './types';
import { getQuizzes, startQuiz, submitQuiz, getLeaderboard } from './services/api';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [user, setUser] = useState<User | null>(null);
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userScore, setUserScore] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (name: string, mobile: string) => {
    setLoading(true);
    setError(null);
    try {
      const userDetails = { name, mobile };
      setUser(userDetails);
      const fetchedQuizzes = await getQuizzes(mobile);
      setQuizzes(fetchedQuizzes);
      setGameState('quizSelection');
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

  const handleQuizSelect = useCallback(async (quizId: number) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) throw new Error("Selected quiz not found.");
        setSelectedQuiz(quiz);

        const fetchedQuestions = await startQuiz(user, quizId);
        setQuestions(fetchedQuestions);
        setGameState('quiz');
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred starting the quiz.");
        }
        setGameState('quizSelection');
    } finally {
        setLoading(false);
    }
  }, [user, quizzes]);
  
  const handleViewLeaderboard = useCallback(async (quizId: number) => {
    setLoading(true);
    setError(null);
    try {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) throw new Error("Selected quiz not found.");
        
        setSelectedQuiz(quiz);
        setUserScore(null); // User is just viewing, not playing

        const leaderboardData = await getLeaderboard(quizId);
        setLeaderboard(leaderboardData);
        setGameState('leaderboard');
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred while fetching the leaderboard.");
        }
    } finally {
        setLoading(false);
    }
  }, [quizzes]);

  const handleFinish = useCallback(async (answers: UserAnswer[], timeTaken: number) => {
    if (!user || !selectedQuiz) return;
    
    try {
      const { score } = await submitQuiz(user, answers, timeTaken, selectedQuiz.id);
      setUserScore(score);
      const leaderboardData = await getLeaderboard(selectedQuiz.id);
      setLeaderboard(leaderboardData);
      setGameState('leaderboard');
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred submitting your score.");
        }
        setGameState('quizSelection'); 
    }
  }, [user, selectedQuiz]);

  const handleChooseAnotherQuiz = () => {
    setQuestions([]);
    setSelectedQuiz(null);
    setUserScore(null);
    setError(null);
    setLoading(false);
    setGameState('quizSelection');
  };

  const handleChangeUser = () => {
    setUser(null);
    setQuizzes([]);
    setQuestions([]);
    setSelectedQuiz(null);
    setUserScore(null);
    setError(null);
    setLoading(false);
    setGameState('start');
  };

  const renderContent = () => {
    switch (gameState) {
      case 'quizSelection':
        return user ? (
            <QuizSelectionScreen 
                userName={user.name} 
                quizzes={quizzes} 
                onSelectQuiz={handleQuizSelect}
                onViewLeaderboard={handleViewLeaderboard}
                loading={loading}
                error={error}
            />
        ) : null;
      case 'quiz':
        return user && questions.length > 0 ? (
          <QuizScreen user={user} questions={questions} onFinish={handleFinish} />
        ) : null;
      case 'leaderboard':
        return selectedQuiz ? (
            <LeaderboardScreen 
                leaderboard={leaderboard} 
                userScore={userScore} 
                onPlayAgain={handleChooseAnotherQuiz} 
                onChangeUser={handleChangeUser}
                quizName={selectedQuiz.name}
            />
        ) : null;
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