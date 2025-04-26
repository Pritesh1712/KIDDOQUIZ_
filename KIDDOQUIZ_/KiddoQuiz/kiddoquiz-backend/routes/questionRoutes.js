const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/question/fetch/:quiz_id
router.get('/fetch/:quiz_id', async (req, res) => {
  try {
    const quiz_id = req.params.quiz_id;
    const [rows] = await pool.query(
      `SELECT * FROM questions WHERE quiz_id = ?`, [quiz_id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'No questions found' });

    const questions = rows.map(q => ({
      questionText: q.question_text,
      questionImage: q.question_image,
      options: [
        { text: q.option1, image: '' },
        { text: q.option2, image: '' },
        { text: q.option3, image: '' },
        { text: q.option4, image: '' }
      ],
      correctOption: q.correct_answer - 1
    }));

    res.json(questions);
  } catch (error) {
    console.error('❌ Error in /api/question/fetch/:quiz_id:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
