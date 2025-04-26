const express = require('express');
const router = express.Router();
const pool = require('../config/db');  // Single import
const auth = require('../middleware/auth');

// Start a quiz attempt
router.post('/start', auth, async (req, res) => {
  try {
    const { quiz_id } = req.body;
    
    const [quizzes] = await pool.query(
      'SELECT id FROM quizzes WHERE quiz_id = ?',
      [quiz_id]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    const quizDbId = quizzes[0].id;
    
    const [attempts] = await pool.query(
      'SELECT id FROM attempts WHERE quiz_id = ? AND user_id = ? AND completed_at IS NULL',
      [quizDbId, req.user.id]
    );
    
    if (attempts.length > 0) {
      return res.json({ attempt_id: attempts[0].id });
    }
    
    const [result] = await pool.query(
      'INSERT INTO attempts (quiz_id, user_id) VALUES (?, ?)',
      [quizDbId, req.user.id]
    );
    
    res.status(201).json({ attempt_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit an answer
router.post('/answer', auth, async (req, res) => {
  try {
    const { attempt_id, question_id, selected_answer } = req.body;
    
    const [questions] = await pool.query(
      'SELECT correct_answer, points FROM questions WHERE id = ?',
      [question_id]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const isCorrect = selected_answer === questions[0].correct_answer;
    const points = isCorrect ? questions[0].points : 0;
    
    await pool.query(
      `INSERT INTO answers 
      (attempt_id, question_id, selected_answer, is_correct) 
      VALUES (?, ?, ?, ?)`,
      [attempt_id, question_id, selected_answer, isCorrect]
    );
    
    await pool.query(
      'UPDATE attempts SET score = score + ? WHERE id = ?',
      [points, attempt_id]
    );
    
    res.json({ correct: isCorrect, points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete attempt
router.post('/complete', auth, async (req, res) => {
  try {
    const { attempt_id, time_taken } = req.body;
    
    await pool.query(
      'UPDATE attempts SET completed_at = NOW(), time_taken = ? WHERE id = ?',
      [time_taken, attempt_id]
    );
    
    const [attempts] = await pool.query(
      'SELECT score FROM attempts WHERE id = ?',
      [attempt_id]
    );
    
    res.json({ score: attempts[0].score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard for a quiz
router.get('/leaderboard/:quiz_id', async (req, res) => {
  try {
    const { quiz_id } = req.params;
    
    const [leaderboard] = await pool.query(
      `SELECT u.email, a.score, a.time_taken, a.completed_at 
      FROM attempts a 
      JOIN quizzes q ON a.quiz_id = q.id 
      JOIN users u ON a.user_id = u.id 
      WHERE q.quiz_id = ? AND a.completed_at IS NOT NULL 
      ORDER BY a.score DESC, a.time_taken ASC 
      LIMIT 10`,
      [quiz_id]
    );
    
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
