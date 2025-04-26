require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const initializeDatabase = require('./utils/dbInit');
const pool = require('./config/db');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
console.log("🚀 server.js started");

// Set up Express app
const app = express();

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../kiddoquiz')));
app.use(express.static(path.join(__dirname, "../")));  // optional extra layer

// Basic security and body parsing
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5500', 'http://192.168.1.33:5500', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb', strict: true }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb', parameterLimit: 1000 }));

// Rate limiter to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Initialize MySQL and start server
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    conn.release();

    await initializeDatabase();
    console.log('✅ Database initialized');

    startServer(); // 🚀 Run after DB is ready
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
})();

function startServer() {
  // API routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/quiz', require('./routes/quizRoutes'));
  app.use('/api/attempt', require('./routes/attemptRoutes'));
  app.use('/api/question', require('./routes/questionRoutes'));
  app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.post('/api/attempt', async (req, res) => {
    const { quiz_id, username, score} = req.body;

    if (!quiz_id || !username || typeof score !== "number") {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO attempt (quiz_id, username, score) 
        VALUES (?, ?, ?)`,
        [quiz_id, username, score]
      );
      res.json({ message: "Attempt saved", id: result.insertId });
    } catch (error) {
      console.error("❌ Error inserting attempt:", error.message);
      res.status(500).json({ error: "Failed to save attempt" });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Start HTTP + WebSocket server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5500', 'http://192.168.1.33:5500'],
      methods: ['GET', 'POST']
    }
  });

  const quizRooms = {}; // Store users in rooms

  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id);

    socket.on('join_room', async ({ roomId, username }) => {
        try {
            console.log(`Join room attempt - Room: ${roomId}, User: ${username}`);

            // Basic validation
            if (!roomId || !username) {
                throw new Error('Room ID and username are required');
            }

            // Check if quiz exists and get participant limit
            const [quiz] = await pool.query(
              `SELECT max_participants, created_by 
               FROM quizzes 
               WHERE quiz_id = ?`,
              [roomId]
            );

            if (!quiz.length) {
                throw new Error('Quiz not found');
            }

            const max_participants = quiz[0].max_participants;
        
            // Initialize room if it doesn't exist
            if (!quizRooms[roomId]) {
                quizRooms[roomId] = [];
                console.log(`New room created: ${roomId}`);
            }

            // Check if user already in room
            const existingUser = quizRooms[roomId].find(user => 
                user.id === socket.id || user.username === username
            );
            if (existingUser) {
                throw new Error('User already in room');
            }

            // Check if room is full
            if (quizRooms[roomId].length >= max_participants) {
                throw new Error('Room is full');
            }

            // Join room
            socket.join(roomId);
            quizRooms[roomId].push({ id: socket.id, username });

            console.log(`👤 ${username} joined room: ${roomId}`);
            console.log(`Current participants: ${quizRooms[roomId].length}/${max_participants}`);

            // Notify all in room
            io.to(roomId).emit('room_update', {
                participants: quizRooms[roomId],
                max_participants,
                roomId
            });

        } catch (error) {
            console.error('❌ Join room error:', error.message);
            socket.emit('join_error', error.message);
        }
    });

    socket.on('start_quiz', (roomId) => {
      console.log(`🚦 Starting quiz in room: ${roomId}`);
      io.to(roomId).emit('quiz_started');
    });

    socket.on('submit_answer', (data) => {
      const { quiz_id, username, answer } = data;
      console.log(`📨 ${username} answered in quiz ${quiz_id}:`, answer);
      socket.to(quiz_id).emit('peer_answered', { username, answer });
    });

    socket.on('disconnect', () => {
      console.log('🔴 A user disconnected:', socket.id);
      for (const roomId in quizRooms) {
        const oldLength = quizRooms[roomId].length;
    
        // Remove the user
        quizRooms[roomId] = quizRooms[roomId].filter(user => user.id !== socket.id);
    
        // If room is now empty, delete it
        if (quizRooms[roomId].length === 0) {
          delete quizRooms[roomId];
          console.log(`🧹 Room ${roomId} deleted (empty)`);
        } else if (quizRooms[roomId].length < oldLength) {
          // Fetch the max participants again if room still exists
          pool.query(`SELECT max_participants FROM quizzes WHERE quiz_id = ?`, [roomId])
            .then(([result]) => {
              if (result.length > 0) {
                io.to(roomId).emit('room_update', {
                  participants: quizRooms[roomId],
                  max_participants: result[0].max_participants,
                  roomId
                });
              }
            })
            .catch(err => console.error("❌ Error fetching max_participants on disconnect:", err));
        }
      }
    });
    
  });

  // Launch server
  server.listen(PORT, () => {
    console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
    console.log(`📎 API Base URL: http://localhost:${PORT}/api`);
  });
}

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught exception:', err);
  process.exit(1);
});