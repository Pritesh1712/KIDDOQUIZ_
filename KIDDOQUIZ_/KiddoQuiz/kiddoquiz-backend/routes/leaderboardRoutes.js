
const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    const quiz_id = req.query.quiz_id;

    if (!quiz_id) {
        return res.status(400).json({ error: 'quiz_id is required' });
    }

    const query = `
        SELECT username, score, submitted_at
        FROM attempt
        WHERE quiz_id = ?
        ORDER BY score DESC, submitted_at ASC
    `;

    try {
        const [results] = await db.query(query, [quiz_id]);
        res.json(results);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

