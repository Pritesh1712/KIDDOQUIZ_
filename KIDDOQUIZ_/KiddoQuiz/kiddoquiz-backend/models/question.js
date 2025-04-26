const pool = require('../config/db');

const Question = {
    create: async (quiz_id, questionData) => {
        try {
            const [result] = await pool.query(
                `INSERT INTO questions 
                (quiz_id, question_text, question_type, question_image, 
                option1, option2, option3, option4, correct_answer, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quiz_id,
                    questionData.question_text,
                    questionData.question_type,
                    questionData.question_image,
                    questionData.options[0].option_text,
                    questionData.options[1].option_text,
                    questionData.options[2]?.option_text || null,
                    questionData.options[3]?.option_text || null,
                    questionData.correct_option,
                    questionData.points || 1
                ]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    getByquiz_id: async (quiz_id) => {
        try {
            const [rows] = await pool.query(
                `SELECT * FROM questions WHERE quiz_id = ?`,
                [quiz_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Question;
