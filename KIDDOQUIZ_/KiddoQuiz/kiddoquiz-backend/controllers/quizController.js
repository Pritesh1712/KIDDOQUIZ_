const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const quizController = {
  createQuiz: async (req, res) => {
    console.log("🔍 Request received in createQuiz", req.body);
    console.log("🧑 User from auth middleware:", req.user);
    let conn;
    try {
      const {
        quiz_id: clientquiz_id,
        num_questions,
        max_time,
        max_participants,
        questions
      } = req.body;

      const quiz_id = clientquiz_id || uuidv4();

      if (!num_questions || !max_time || !questions || !Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields or invalid question format'
        });
      }
      if (!max_participants || isNaN(max_participants) || max_participants < 1) {
          return res.status(400).json({ 
              success: false,
              message: 'Please provide a valid number of participants (minimum 1)' 
          });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized (user missing)" });
      }

      const created_by = req.user.id;

      conn = await pool.getConnection();
      await conn.beginTransaction();

      console.log("📥 Inserting quiz with values:", {
        quiz_id, num_questions, max_participants, max_time, created_by
      });

      // ✅ Insert into quizzes 
      const [quizResult] = await conn.query(
        `INSERT INTO quizzes 
        (quiz_id, num_questions, max_participants, max_time, created_by) 
        VALUES (?, ?, ?, ?, ?)`,
        [quiz_id, num_questions, max_participants, max_time, created_by]
      );

      // ✅ Insert questions
      for (const q of questions) {
        if (!q.question_text || !q.correct_option || !q.options) {
          throw new Error('Missing required question fields');
        }


        await conn.query(
          `INSERT INTO questions 
          (quiz_id, question_text, question_type, question_image, 
          option1, option2, option3, option4, correct_answer, points) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            quiz_id,
            q.question_text,
            q.question_type || 'text',
            q.question_image || null,
            q.options[0]?.option_text || '',
            q.options[1]?.option_text || '',
            q.options[2]?.option_text || null,
            q.options[3]?.option_text || null,
            q.correct_option,
            q.points || 1
          ]
        );
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        quiz_id
      });

    } catch (err) {
      if (conn) await conn.rollback();
      console.error('Transaction error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error processing quiz data',
        error: err
      });
    } finally {
      if (conn) conn.release();
    }
  },

  getQuizById: async (req, res) => {
    try {
      const { quiz_id } = req.params;

      const [quizzes] = await pool.query(
        `SELECT q.id, q.quiz_id, q.num_questions, 
        q.max_participants, q.max_time, u.email as created_by 
        FROM quizzes q JOIN users u ON q.created_by = u.id 
        WHERE q.quiz_id = ?`,
        [quiz_id]
      );

      if (quizzes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      const [questions] = await pool.query(
        `SELECT id, question_text, question_type, question_image, 
        option1, option2, option3, option4, correct_answer, points 
        FROM questions WHERE quiz_id = ?`,
        [quizzes[0].id]
      );

      const formattedQuestions = questions.map(q => {
        const options = [
          { option_text: q.option1, option_number: 1 },
          { option_text: q.option2, option_number: 2 },
          ...(q.option3 ? [{ option_text: q.option3, option_number: 3 }] : []),
          ...(q.option4 ? [{ option_text: q.option4, option_number: 4 }] : [])
        ];

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          question_image: q.question_image,
          options,
          correct_answer: q.correct_answer,
          points: q.points
        };
      });

      return res.json({
        success: true,
        ...quizzes[0],
        questions: formattedQuestions
      });
    } catch (err) {
      console.error('Error fetching quiz:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error while fetching quiz'
      });
    }
  }
};

module.exports = quizController;

