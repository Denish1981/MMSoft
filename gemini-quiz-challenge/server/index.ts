// FIX: Change express import and type annotations to use `express.Request` and
// `express.Response` to resolve type conflicts with global DOM types.
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

    // POST /api/start
    app.post('/api/start', async (req: express.Request, res: express.Response) => {
      const { name, mobile } = req.body;

      if (!name || !mobile || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'Invalid name or mobile number.' });
      }

      try {
        const userCheck = await query('SELECT id FROM participants WHERE mobile = $1', [mobile]);
        if (userCheck.rows.length > 0) {
          return res.status(409).json({ message: 'This mobile number has already been used for the quiz.' });
        }

        const questionsResult = await query(`
            SELECT q.id, q.question_text AS "questionText", array_agg(o.option_text ORDER BY random()) as options
            FROM questions q
            JOIN options o ON q.id = o.question_id
            WHERE q.id IN (SELECT id FROM questions ORDER BY RANDOM() LIMIT 5)
            GROUP BY q.id, q.question_text
            ORDER BY RANDOM();
        `);

        res.json(questionsResult.rows);
      } catch (error) {
        console.error('Error starting quiz:', error);
        res.status(500).json({ message: 'Failed to start quiz.' });
      }
    });

    // POST /api/submit
    app.post('/api/submit', async (req: express.Request, res: express.Response) => {
      const { user, answers, timeTaken } = req.body;

      if (!user || !answers || timeTaken === undefined) {
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

        await query(
          'INSERT INTO participants (name, mobile, score, time_taken_seconds) VALUES ($1, $2, $3, $4)',
          [user.name, user.mobile, score, timeTaken]
        );

        res.status(201).json({ score });
      } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Failed to submit quiz results.' });
      }
    });


    // GET /api/leaderboard
    app.get('/api/leaderboard', async (req: express.Request, res: express.Response) => {
      try {
        const result = await query(
          'SELECT name, score, time_taken_seconds AS "timeTaken" FROM participants ORDER BY score DESC, time_taken_seconds ASC'
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
