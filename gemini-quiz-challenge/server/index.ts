// FIX: Changed type annotations for Express request and response objects to use `express.Request` and `express.Response` to avoid conflicts with global DOM types.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, initializeDatabase } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Wrap server startup in an async function to allow for awaiting the DB connection.
const startServer = async () => {
  try {
    // 1. Await the database connection check. The server will not start if this fails.
    // The success message is now logged from within initializeDatabase.
    await initializeDatabase();

    // 2. Setup middleware and routes ONLY after the DB is confirmed to be connected.
    app.use(cors());
    app.use('/api', express.json());

    // --- API Endpoints ---

    // GET /api/quizzes
    app.get('/api/quizzes', async (req: express.Request, res: express.Response) => {
      const { mobile } = req.query;

      if (!mobile || typeof mobile !== 'string' || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
      }

      try {
        const queryText = `
          SELECT
            q.id,
            q.name,
            q.description,
            p.mobile IS NOT NULL AS completed
          FROM quizzes q
          LEFT JOIN participants p ON q.id = p.quiz_id AND p.mobile = $1
          ORDER BY q.id;
        `;
        const quizzesResult = await query(queryText, [mobile]);
        res.json(quizzesResult.rows);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Failed to fetch quizzes.' });
      }
    });

    // POST /api/start
    app.post('/api/start', async (req: express.Request, res: express.Response) => {
      const { user, quizId } = req.body;
      
      if (!user || !user.name || !user.mobile || !/^\d{10}$/.test(user.mobile) || !quizId) {
        return res.status(400).json({ message: 'Invalid name, mobile number, or missing quiz ID.' });
      }

      try {
        const questionsResult = await query(`
            SELECT q.id, q.question_text AS "questionText", array_agg(o.option_text ORDER BY random()) as options
            FROM questions q
            JOIN options o ON q.id = o.question_id
            WHERE q.quiz_id = $1
            GROUP BY q.id, q.question_text
            ORDER BY RANDOM()
            LIMIT 5;
        `, [quizId]);
        
        if (questionsResult.rows.length === 0) {
            return res.status(404).json({ message: 'No questions found for this quiz.' });
        }

        res.json(questionsResult.rows);
      } catch (error) {
        console.error('Error starting quiz:', error);
        res.status(500).json({ message: 'Failed to start quiz.' });
      }
    });

    // POST /api/submit
    app.post('/api/submit', async (req: express.Request, res: express.Response) => {
      const { user, answers, timeTaken, quizId } = req.body;

      if (!user || !answers || timeTaken === undefined || !quizId) {
        return res.status(400).json({ message: 'Missing required submission data.' });
      }

      try {
        let score = 0;
        for (const userAnswer of answers) {
          const result = await query(
            'SELECT is_correct FROM options WHERE question_id = $1 AND option_text = $2',
            [userAnswer.questionId, userAnswer.answer]
          );
          if (result.rows.length > 0 && result.rows[0].is_correct) {
            score++;
          }
        }
        
        const insertQuery = `
          INSERT INTO participants (name, mobile, score, time_taken_seconds, quiz_id)
          VALUES ($1, $2, $3, $4, $5);
        `;
        
        await query(insertQuery, [user.name, user.mobile, score, timeTaken, quizId]);

        res.status(201).json({ score });
      } catch (error) {
        // Check for unique_violation error code from postgres (code '23505')
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return res.status(409).json({ message: 'You have already submitted this quiz.' });
        }
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Failed to submit quiz results.' });
      }
    });


    // GET /api/leaderboard/:quizId
    app.get('/api/leaderboard/:quizId', async (req: express.Request, res: express.Response) => {
      const { quizId } = req.params;

      if (!quizId || isNaN(parseInt(quizId, 10))) {
        return res.status(400).json({ message: 'A valid quiz ID is required.' });
      }

      try {
        const result = await query(
          `SELECT name, score, time_taken_seconds AS "timeTaken" 
           FROM participants 
           WHERE quiz_id = $1
           ORDER BY score DESC, time_taken_seconds ASC`,
          [quizId]
        );
        
        const leaderboard = result.rows.map((row, index) => ({
          ...row,
          rank: index + 1,
        }));

        res.json(leaderboard);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Failed to fetch leaderboard.' });
      }
    });

    // 3. Start listening for HTTP requests.
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    // This will now reliably catch the DB connection error before the server starts.
    console.error('FATAL: Could not connect to the database. Server is shutting down.', error);
    process.exit(1);
  }
};

// Start the server
startServer();