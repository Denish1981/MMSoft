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

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- Add a column to link questions to a quiz
ALTER TABLE questions
ADD COLUMN quiz_id INTEGER;

-- Create a foreign key relationship to the quizzes table
ALTER TABLE questions
ADD CONSTRAINT fk_quiz
FOREIGN KEY (quiz_id)
REFERENCES quizzes(id)
ON DELETE CASCADE; -- This will delete all questions of a quiz if the quiz is deleted

-- After assigning a quiz_id to all existing questions, make the column mandatory
ALTER TABLE questions
ALTER COLUMN quiz_id SET NOT NULL;

-- Add a column to link a participant's entry to a specific quiz
ALTER TABLE participants
ADD COLUMN quiz_id INTEGER;

-- Create the foreign key relationship
ALTER TABLE participants
ADD CONSTRAINT fk_quiz
FOREIGN KEY (quiz_id)
REFERENCES quizzes(id)
ON DELETE CASCADE; -- Deletes participant entries if the quiz is removed

-- After assigning a quiz_id to all existing entries, make the column mandatory
ALTER TABLE participants
ALTER COLUMN quiz_id SET NOT NULL;

-- If you have a unique constraint on just the 'mobile' column, you need to remove it first.
-- The name might be different; you can find it using \d participants in psql.
-- ALTER TABLE participants DROP CONSTRAINT participants_mobile_key;

-- Add a new unique constraint for the combination of mobile and quiz_id
ALTER TABLE participants
ADD CONSTRAINT unique_participant_per_quiz
UNIQUE (mobile, quiz_id);

ALTER TABLE participants DROP CONSTRAINT participants_mobile_key;

