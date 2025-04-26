USE kiddoquiz;
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  last_token_issued_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
    quiz_id VARCHAR(36) NOT NULL PRIMARY KEY,
    created_by INT NOT NULL,
    num_questions INT NOT NULL,
    max_participants INT DEFAULT NULL,
    max_time INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id VARCHAR(36) NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('text', 'image') DEFAULT 'text',
  question_image VARCHAR(255),
  option1 TEXT NOT NULL,
  option2 TEXT NOT NULL,
  option3 TEXT NOT NULL,
  option4 TEXT NOT NULL,
  correct_answer INT NOT NULL COMMENT '1-4',
  points INT DEFAULT 1,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

CREATE TABLE attempt (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id VARCHAR(255),
  username VARCHAR(255),
  score INT,
  time_taken INT, -- Duration in seconds
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Time of submission
  FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Create leaderboard view

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  a.quiz_id,
  a.username,
  a.score,
  a.time_taken
FROM attempt a
JOIN quizzes q ON a.quiz_id = q.quiz_id
WHERE a.submitted_at IS NOT NULL
ORDER BY a.quiz_id, a.score DESC, a.time_taken;

