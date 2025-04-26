const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const quizController = require('../controllers/quizController');

// Secure this route
router.post('/create', auth, quizController.createQuiz);

module.exports = router;
