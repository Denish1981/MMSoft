-- Table to store all the quiz questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL
);

-- Table to store the multiple-choice options for each question
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

-- Table to store user information and their quiz results
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    score INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Create an index on the options table for faster lookups
CREATE INDEX idx_options_question_id ON options(question_id);

-- Optional: Create an index on the participants table for the leaderboard
CREATE INDEX idx_participants_leaderboard ON participants(score DESC, time_taken_seconds ASC);