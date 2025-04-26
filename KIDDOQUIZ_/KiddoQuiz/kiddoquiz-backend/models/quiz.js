const pool = require('../config/db');

const Quiz = {
    create: async (quizData) => {
        try {
            const [result] = await pool.query(
                `INSERT INTO quizzes 
                (quiz_id, num_questions, max_participants, max_time, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    quizData.quiz_id,
                    quizData.num_questions,
                    quizData.max_participants,
                    quizData.max_time,
                    quizData.created_by
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Quiz insert error:', error);
            throw error;
        }
    },

    getById: async (quiz_id) => {
        try {
            const [rows] = await pool.query(
                `SELECT * FROM quizzes WHERE quiz_id = ?`,
                [quiz_id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Quiz;
