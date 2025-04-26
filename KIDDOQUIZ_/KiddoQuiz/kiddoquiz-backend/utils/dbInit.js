const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length > 0) {
      console.log('Database tables already exist');
      return;
    }

    const sql = fs.readFileSync(
      path.join(__dirname, '../sql/create_tables.sql'), 
      'utf8'
    );
    
    const statements = sql.split(';').filter(statement => {
      return statement.trim().length > 0;
    });
    
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = initializeDatabase;