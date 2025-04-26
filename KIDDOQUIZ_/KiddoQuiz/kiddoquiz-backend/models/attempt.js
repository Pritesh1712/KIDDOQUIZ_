const pool = require('../config/db');

const Attempt = {
    create: async (userId, quiz_id, score, time_taken) => {
        try {
            const [result] = await pool.query(
                `INSERT INTO attempts 
                (user_id, quiz_id, score, time_taken, completed_at) 
                VALUES (?, ?, ?, ?, NOW())`,
                [userId, quiz_id, score, time_taken]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    getByUserAndQuiz: async (userId, quiz_id) => {
        try {
            const [rows] = await pool.query(
                `SELECT * FROM attempts 
                WHERE user_id = ? AND quiz_id = ? 
                ORDER BY completed_at DESC`,
                [userId, quiz_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    getLeaderboard: async (quiz_id) => {
        try {
            const [rows] = await pool.query(
                `SELECT * FROM leaderboard 
                WHERE quiz_id = ? 
                ORDER BY rank ASC 
                LIMIT 10`,
                [quiz_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Attempt;
